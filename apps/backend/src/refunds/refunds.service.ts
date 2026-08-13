import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from '../common/stripe/stripe.service';
import { RedisService } from '../common/redis/redis.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import { OrderStatus, PaymentStatus, RefundStatus, AuditAction } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly redis: RedisService,
    private readonly inventoryService: InventoryService,
    private readonly auditService: AuditService,
  ) {}

  async createRefund(merchantId: string, params: {
    orderId: string;
    amount: number;
    reason?: string;
    notes?: string;
    restoreInventory?: boolean;
    items?: Array<{ orderItemId: string; quantity: number; amount: number }>;
    idempotencyKey?: string;
  }) {
    const idempotencyKey = params.idempotencyKey || `refund-${params.orderId}-${uuidv4()}`;

    // Check idempotency
    const cached = await this.redis.checkIdempotencyKey(idempotencyKey);
    if (cached) return JSON.parse(cached);

    const order = await this.prisma.order.findFirst({
      where: { id: params.orderId, merchantId },
      include: { payments: true, refunds: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    const successfulPayment = order.payments.find(
      (p) => p.status === PaymentStatus.SUCCEEDED,
    );

    if (!successfulPayment) {
      throw new BadRequestException('No successful payment found for this order');
    }

    // Calculate already-refunded amount
    const alreadyRefunded = order.refunds
      .filter((r) => r.status === RefundStatus.SUCCEEDED)
      .reduce((sum, r) => sum + r.amount, 0);

    const maxRefundable = successfulPayment.amount - alreadyRefunded;

    if (params.amount > maxRefundable) {
      throw new BadRequestException(
        `Cannot refund ${params.amount}. Maximum refundable: ${maxRefundable}`,
      );
    }

    // Prevent duplicate pending refunds for the same amount
    const pendingRefund = order.refunds.find(
      (r) => r.status === RefundStatus.PENDING && r.amount === params.amount,
    );
    if (pendingRefund) {
      throw new ConflictException('A refund for this amount is already pending');
    }

    const merchant = await this.prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } });

    // Create refund record first
    const refund = await this.prisma.refund.create({
      data: {
        merchantId,
        orderId: params.orderId,
        paymentId: successfulPayment.id,
        status: RefundStatus.PENDING,
        amount: params.amount,
        currency: successfulPayment.currency,
        reason: params.reason,
        notes: params.notes,
        restoreInventory: params.restoreInventory ?? true,
        idempotencyKey,
        items: params.items
          ? {
              create: params.items.map((item) => ({
                orderItemId: item.orderItemId,
                quantity: item.quantity,
                amount: item.amount,
              })),
            }
          : undefined,
      },
    });

    try {
      // Process refund via Stripe (if card payment)
      if (successfulPayment.method !== 'CASH' && successfulPayment.stripeChargeId) {
        const stripeRefund = await this.stripe.createRefund({
          chargeId: successfulPayment.stripeChargeId,
          amount: params.amount,
          reason: this.mapRefundReason(params.reason),
          connectedAccountId: merchant.stripeAccountId!,
          idempotencyKey: `stripe-${idempotencyKey}`,
        });

        await this.prisma.refund.update({
          where: { id: refund.id },
          data: {
            stripeRefundId: stripeRefund.id,
            status: RefundStatus.SUCCEEDED,
            processedAt: new Date(),
          },
        });
      } else {
        // Cash refund - immediate
        await this.prisma.refund.update({
          where: { id: refund.id },
          data: { status: RefundStatus.SUCCEEDED, processedAt: new Date() },
        });
      }

      // Update order status
      const totalRefunded = alreadyRefunded + params.amount;
      const isFullRefund = totalRefunded >= successfulPayment.amount;

      await this.prisma.order.update({
        where: { id: params.orderId },
        data: {
          status: isFullRefund ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED,
        },
      });

      // Restore inventory if requested
      if (params.restoreInventory !== false) {
        const itemsToRestore = params.items?.map((item) => ({
          productId: item.orderItemId,
          quantity: item.quantity,
        }));
        await this.inventoryService.restoreOrderInventory(params.orderId, merchantId).catch(
          (e) => this.logger.error('Inventory restore failed:', e),
        );
      }

      await this.auditService.log({
        merchantId,
        action: AuditAction.PAYMENT_REFUND,
        resource: 'refund',
        resourceId: refund.id,
        after: { amount: params.amount, orderId: params.orderId },
      });

      const result = await this.prisma.refund.findUniqueOrThrow({ where: { id: refund.id } });
      await this.redis.setIdempotencyKey(idempotencyKey, JSON.stringify(result));

      return result;
    } catch (error) {
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.FAILED,
          failureReason: (error as Error).message,
        },
      });
      throw error;
    }
  }

  async getRefunds(merchantId: string, orderId?: string) {
    return this.prisma.refund.findMany({
      where: { merchantId, ...(orderId && { orderId }) },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private mapRefundReason(reason?: string): 'duplicate' | 'fraudulent' | 'requested_by_customer' | undefined {
    if (!reason) return 'requested_by_customer';
    if (reason.toLowerCase().includes('duplicate')) return 'duplicate';
    if (reason.toLowerCase().includes('fraud')) return 'fraudulent';
    return 'requested_by_customer';
  }
}
