import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from '../common/stripe/stripe.service';
import { RedisService } from '../common/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import { OrderStatus, PaymentMethod, PaymentStatus, AuditAction } from '@prisma/client';
import { calculatePlatformFee } from '../common/utils/money.util';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    private readonly inventoryService: InventoryService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a PaymentIntent for a Terminal (card-present) payment.
   * The mobile app receives the client_secret and uses the Stripe Terminal SDK.
   * NEVER returns the secret key to the client.
   */
  async createPaymentIntent(merchantId: string, params: {
    orderId: string;
    paymentMethod: PaymentMethod;
    idempotencyKey: string;
  }) {
    // Check idempotency
    const cached = await this.redis.checkIdempotencyKey(params.idempotencyKey);
    if (cached) {
      this.logger.log(`Idempotent request: ${params.idempotencyKey}`);
      return JSON.parse(cached);
    }

    const order = await this.prisma.order.findFirst({
      where: { id: params.orderId, merchantId },
      include: { payments: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Prevent double-charging: check if there's already a successful payment
    const existingSuccessful = order.payments.find(
      (p) => p.status === PaymentStatus.SUCCEEDED,
    );
    if (existingSuccessful) {
      throw new ConflictException('This order has already been paid');
    }

    const merchant = await this.prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } });

    if (!merchant.stripeAccountId || !merchant.stripeChargesEnabled) {
      throw new BadRequestException('Stripe payment account is not fully set up');
    }

    const platformFeeRate = Number(merchant.platformFeeRate);
    const platformFeeAmount = calculatePlatformFee(order.totalAmount, platformFeeRate);

    // For Tap to Pay / card present, payment_method_types = ['card_present']
    const paymentMethodTypes =
      params.paymentMethod === PaymentMethod.TAP_TO_PAY ||
      params.paymentMethod === PaymentMethod.CARD_PRESENT
        ? ['card_present']
        : params.paymentMethod === PaymentMethod.APPLE_PAY || params.paymentMethod === PaymentMethod.GOOGLE_PAY
        ? ['card']
        : ['card'];

    const stripePaymentIntent = await this.stripe.createPaymentIntent({
      amount: order.totalAmount,
      currency: order.currency,
      connectedAccountId: merchant.stripeAccountId,
      applicationFeeAmount: platformFeeAmount,
      idempotencyKey: params.idempotencyKey,
      paymentMethodTypes,
      metadata: {
        orderId: order.id,
        merchantId,
        orderNumber: order.orderNumber,
      },
    });

    // Create our payment record
    const payment = await this.prisma.payment.create({
      data: {
        merchantId,
        orderId: order.id,
        stripePaymentIntentId: stripePaymentIntent.id,
        status: PaymentStatus.PENDING,
        method: params.paymentMethod,
        amount: order.totalAmount,
        currency: order.currency,
        platformFeeAmount,
        netAmount: order.totalAmount - platformFeeAmount,
        tipAmount: order.tipAmount,
        idempotencyKey: params.idempotencyKey,
      },
    });

    await this.prisma.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        stripePaymentIntentId: stripePaymentIntent.id,
        status: PaymentStatus.PENDING,
        amount: order.totalAmount,
        method: params.paymentMethod,
      },
    });

    // Update order status to pending
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PENDING },
    });

    const result = {
      paymentId: payment.id,
      // clientSecret is used by Stripe Terminal SDK - ONLY return to authenticated merchant
      clientSecret: stripePaymentIntent.client_secret,
      paymentIntentId: stripePaymentIntent.id,
      amount: order.totalAmount,
      currency: order.currency,
    };

    // Cache for idempotency
    await this.redis.setIdempotencyKey(params.idempotencyKey, JSON.stringify(result));

    await this.auditService.log({
      merchantId,
      action: AuditAction.PAYMENT_CREATE,
      resource: 'payment',
      resourceId: payment.id,
      after: { orderId: order.id, amount: order.totalAmount },
    });

    return result;
  }

  /**
   * Process cash payment - immediate completion
   */
  async processCashPayment(merchantId: string, params: {
    orderId: string;
    amount: number;
    tendered: number;
    idempotencyKey: string;
    employeeId?: string;
  }) {
    const cached = await this.redis.checkIdempotencyKey(params.idempotencyKey);
    if (cached) return JSON.parse(cached);

    const order = await this.prisma.order.findFirst({
      where: { id: params.orderId, merchantId },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.totalAmount !== params.amount) {
      throw new BadRequestException('Payment amount does not match order total');
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          merchantId,
          orderId: order.id,
          status: PaymentStatus.SUCCEEDED,
          method: PaymentMethod.CASH,
          amount: order.totalAmount,
          currency: order.currency,
          platformFeeAmount: 0, // No platform fee on cash
          netAmount: order.totalAmount,
          tipAmount: order.tipAmount,
          idempotencyKey: params.idempotencyKey,
          capturedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID, paidAt: new Date() },
      });

      return p;
    });

    await this.inventoryService.processOrderInventory(order.id, merchantId);

    const result = {
      paymentId: payment.id,
      status: 'succeeded',
      amount: payment.amount,
      change: params.tendered - params.amount,
    };

    await this.redis.setIdempotencyKey(params.idempotencyKey, JSON.stringify(result));

    await this.auditService.log({
      merchantId,
      action: AuditAction.PAYMENT_CAPTURE,
      resource: 'payment',
      resourceId: payment.id,
      after: { method: 'cash', amount: payment.amount },
    });

    return result;
  }

  /**
   * Confirm a payment after Stripe Terminal capture
   * Called by the mobile app after terminal.collectPaymentMethod + terminal.processPayment
   */
  async confirmPayment(merchantId: string, paymentIntentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntentId, merchantId },
      include: { order: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    const merchant = await this.prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } });

    // Always retrieve from Stripe to get authoritative status
    const stripePaymentIntent = await this.stripe.retrievePaymentIntent(
      paymentIntentId,
      merchant.stripeAccountId!,
    );

    if (stripePaymentIntent.status === 'succeeded') {
      return this.handlePaymentSuccess(payment.id, stripePaymentIntent);
    } else if (stripePaymentIntent.status === 'requires_capture') {
      return this.stripe.capturePaymentIntent(paymentIntentId, merchant.stripeAccountId!);
    }

    return {
      paymentId: payment.id,
      status: stripePaymentIntent.status,
    };
  }

  async handlePaymentSuccess(paymentId: string, stripePaymentIntent: { id: string; charges?: { data?: Array<{ id?: string; payment_method_details?: { card?: { last4?: string; brand?: string } }; receipt_url?: string }> }; status: string }) {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { order: true },
    });

    if (payment.status === PaymentStatus.SUCCEEDED) {
      return payment; // Already processed
    }

    const charge = stripePaymentIntent.charges?.data?.[0];

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.SUCCEEDED,
          stripeChargeId: charge?.id,
          last4: charge?.payment_method_details?.card?.last4,
          cardBrand: charge?.payment_method_details?.card?.brand,
          receiptUrl: charge?.receipt_url,
          capturedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAID, paidAt: new Date() },
      });

      // Record platform fee
      await tx.platformFee.create({
        data: {
          merchantId: payment.merchantId,
          paymentId: paymentId,
          transactionAmount: payment.amount,
          feeRate: 0.01,
          feeAmount: payment.platformFeeAmount,
          currency: payment.currency,
        },
      });

      return p;
    });

    // Async: update inventory, update customer stats
    await this.inventoryService.processOrderInventory(payment.orderId, payment.merchantId).catch(
      (e) => this.logger.error('Inventory update failed:', e),
    );

    await this.updateCustomerStats(payment.orderId, payment.merchantId).catch(
      (e) => this.logger.error('Customer stats update failed:', e),
    );

    await this.auditService.log({
      merchantId: payment.merchantId,
      action: AuditAction.PAYMENT_CAPTURE,
      resource: 'payment',
      resourceId: paymentId,
    });

    return updatedPayment;
  }

  async handlePaymentFailure(paymentId: string, reason: string) {
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });

    if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.PROCESSING) {
      return payment;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
          failureReason: reason,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.FAILED },
      });
    });

    await this.auditService.log({
      merchantId: payment.merchantId,
      action: AuditAction.PAYMENT_FAIL,
      resource: 'payment',
      resourceId: paymentId,
      after: { reason },
    });
  }

  async getPayment(merchantId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, merchantId },
      include: {
        order: true,
        refunds: true,
        platformFee: true,
        attempts: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  private async updateCustomerStats(orderId: string, merchantId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    if (!order.customerId) return;

    const stats = await this.prisma.order.aggregate({
      where: { customerId: order.customerId, merchantId, status: OrderStatus.PAID },
      _sum: { totalAmount: true },
      _count: true,
    });

    const totalSpent = (stats._sum.totalAmount || 0) / 100;
    const orderCount = stats._count;
    const averageOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

    await this.prisma.customer.update({
      where: { id: order.customerId },
      data: {
        totalSpent,
        orderCount,
        averageOrderValue,
        lastPurchaseAt: new Date(),
      },
    });
  }
}
