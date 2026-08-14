"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const stripe_service_1 = require("../common/stripe/stripe.service");
const redis_service_1 = require("../common/redis/redis.service");
const config_1 = require("@nestjs/config");
const inventory_service_1 = require("../inventory/inventory.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
const money_util_1 = require("../common/utils/money.util");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(prisma, stripe, redis, configService, inventoryService, auditService) {
        this.prisma = prisma;
        this.stripe = stripe;
        this.redis = redis;
        this.configService = configService;
        this.inventoryService = inventoryService;
        this.auditService = auditService;
        this.logger = new common_1.Logger(PaymentsService_1.name);
    }
    async createPaymentIntent(merchantId, params) {
        const cached = await this.redis.checkIdempotencyKey(params.idempotencyKey);
        if (cached) {
            this.logger.log(`Idempotent request: ${params.idempotencyKey}`);
            return JSON.parse(cached);
        }
        const order = await this.prisma.order.findFirst({
            where: { id: params.orderId, merchantId },
            include: { payments: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const existingSuccessful = order.payments.find((p) => p.status === client_1.PaymentStatus.SUCCEEDED);
        if (existingSuccessful) {
            throw new common_1.ConflictException('This order has already been paid');
        }
        const merchant = await this.prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } });
        if (!merchant.stripeAccountId || !merchant.stripeChargesEnabled) {
            throw new common_1.BadRequestException('Stripe payment account is not fully set up');
        }
        const platformFeeRate = Number(merchant.platformFeeRate);
        const platformFeeAmount = (0, money_util_1.calculatePlatformFee)(order.totalAmount, platformFeeRate);
        const paymentMethodTypes = params.paymentMethod === client_1.PaymentMethod.TAP_TO_PAY ||
            params.paymentMethod === client_1.PaymentMethod.CARD_PRESENT
            ? ['card_present']
            : params.paymentMethod === client_1.PaymentMethod.APPLE_PAY || params.paymentMethod === client_1.PaymentMethod.GOOGLE_PAY
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
        const payment = await this.prisma.payment.create({
            data: {
                merchantId,
                orderId: order.id,
                stripePaymentIntentId: stripePaymentIntent.id,
                status: client_1.PaymentStatus.PENDING,
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
                status: client_1.PaymentStatus.PENDING,
                amount: order.totalAmount,
                method: params.paymentMethod,
            },
        });
        await this.prisma.order.update({
            where: { id: order.id },
            data: { status: client_1.OrderStatus.PENDING },
        });
        const result = {
            paymentId: payment.id,
            clientSecret: stripePaymentIntent.client_secret,
            paymentIntentId: stripePaymentIntent.id,
            amount: order.totalAmount,
            currency: order.currency,
        };
        await this.redis.setIdempotencyKey(params.idempotencyKey, JSON.stringify(result));
        await this.auditService.log({
            merchantId,
            action: client_1.AuditAction.PAYMENT_CREATE,
            resource: 'payment',
            resourceId: payment.id,
            after: { orderId: order.id, amount: order.totalAmount },
        });
        return result;
    }
    async processCashPayment(merchantId, params) {
        const cached = await this.redis.checkIdempotencyKey(params.idempotencyKey);
        if (cached)
            return JSON.parse(cached);
        const order = await this.prisma.order.findFirst({
            where: { id: params.orderId, merchantId },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.totalAmount !== params.amount) {
            throw new common_1.BadRequestException('Payment amount does not match order total');
        }
        const payment = await this.prisma.$transaction(async (tx) => {
            const p = await tx.payment.create({
                data: {
                    merchantId,
                    orderId: order.id,
                    status: client_1.PaymentStatus.SUCCEEDED,
                    method: client_1.PaymentMethod.CASH,
                    amount: order.totalAmount,
                    currency: order.currency,
                    platformFeeAmount: 0,
                    netAmount: order.totalAmount,
                    tipAmount: order.tipAmount,
                    idempotencyKey: params.idempotencyKey,
                    capturedAt: new Date(),
                },
            });
            await tx.order.update({
                where: { id: order.id },
                data: { status: client_1.OrderStatus.PAID, paidAt: new Date() },
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
            action: client_1.AuditAction.PAYMENT_CAPTURE,
            resource: 'payment',
            resourceId: payment.id,
            after: { method: 'cash', amount: payment.amount },
        });
        return result;
    }
    async confirmPayment(merchantId, paymentIntentId) {
        const payment = await this.prisma.payment.findFirst({
            where: { stripePaymentIntentId: paymentIntentId, merchantId },
            include: { order: true },
        });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        const merchant = await this.prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } });
        const stripePaymentIntent = await this.stripe.retrievePaymentIntent(paymentIntentId, merchant.stripeAccountId);
        if (stripePaymentIntent.status === 'succeeded') {
            return this.handlePaymentSuccess(payment.id, stripePaymentIntent);
        }
        else if (stripePaymentIntent.status === 'requires_capture') {
            return this.stripe.capturePaymentIntent(paymentIntentId, merchant.stripeAccountId);
        }
        return {
            paymentId: payment.id,
            status: stripePaymentIntent.status,
        };
    }
    async handlePaymentSuccess(paymentId, stripePaymentIntent) {
        const payment = await this.prisma.payment.findUniqueOrThrow({
            where: { id: paymentId },
            include: { order: true },
        });
        if (payment.status === client_1.PaymentStatus.SUCCEEDED) {
            return payment;
        }
        const charge = stripePaymentIntent.charges?.data?.[0];
        const updatedPayment = await this.prisma.$transaction(async (tx) => {
            const p = await tx.payment.update({
                where: { id: paymentId },
                data: {
                    status: client_1.PaymentStatus.SUCCEEDED,
                    stripeChargeId: charge?.id,
                    last4: charge?.payment_method_details?.card?.last4,
                    cardBrand: charge?.payment_method_details?.card?.brand,
                    receiptUrl: charge?.receipt_url,
                    capturedAt: new Date(),
                },
            });
            await tx.order.update({
                where: { id: payment.orderId },
                data: { status: client_1.OrderStatus.PAID, paidAt: new Date() },
            });
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
        await this.inventoryService.processOrderInventory(payment.orderId, payment.merchantId).catch((e) => this.logger.error('Inventory update failed:', e));
        await this.updateCustomerStats(payment.orderId, payment.merchantId).catch((e) => this.logger.error('Customer stats update failed:', e));
        await this.auditService.log({
            merchantId: payment.merchantId,
            action: client_1.AuditAction.PAYMENT_CAPTURE,
            resource: 'payment',
            resourceId: paymentId,
        });
        return updatedPayment;
    }
    async handlePaymentFailure(paymentId, reason) {
        const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
        if (payment.status !== client_1.PaymentStatus.PENDING && payment.status !== client_1.PaymentStatus.PROCESSING) {
            return payment;
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: paymentId },
                data: {
                    status: client_1.PaymentStatus.FAILED,
                    failedAt: new Date(),
                    failureReason: reason,
                },
            });
            await tx.order.update({
                where: { id: payment.orderId },
                data: { status: client_1.OrderStatus.FAILED },
            });
        });
        await this.auditService.log({
            merchantId: payment.merchantId,
            action: client_1.AuditAction.PAYMENT_FAIL,
            resource: 'payment',
            resourceId: paymentId,
            after: { reason },
        });
    }
    async getPayment(merchantId, paymentId) {
        const payment = await this.prisma.payment.findFirst({
            where: { id: paymentId, merchantId },
            include: {
                order: true,
                refunds: true,
                platformFee: true,
                attempts: { orderBy: { createdAt: 'desc' } },
            },
        });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        return payment;
    }
    async updateCustomerStats(orderId, merchantId) {
        const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
        if (!order.customerId)
            return;
        const stats = await this.prisma.order.aggregate({
            where: { customerId: order.customerId, merchantId, status: client_1.OrderStatus.PAID },
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
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stripe_service_1.StripeService,
        redis_service_1.RedisService,
        config_1.ConfigService,
        inventory_service_1.InventoryService,
        audit_service_1.AuditService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map