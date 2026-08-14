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
var RefundsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const stripe_service_1 = require("../common/stripe/stripe.service");
const redis_service_1 = require("../common/redis/redis.service");
const inventory_service_1 = require("../inventory/inventory.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
let RefundsService = RefundsService_1 = class RefundsService {
    constructor(prisma, stripe, redis, inventoryService, auditService) {
        this.prisma = prisma;
        this.stripe = stripe;
        this.redis = redis;
        this.inventoryService = inventoryService;
        this.auditService = auditService;
        this.logger = new common_1.Logger(RefundsService_1.name);
    }
    async createRefund(merchantId, params) {
        const idempotencyKey = params.idempotencyKey || `refund-${params.orderId}-${(0, uuid_1.v4)()}`;
        const cached = await this.redis.checkIdempotencyKey(idempotencyKey);
        if (cached)
            return JSON.parse(cached);
        const order = await this.prisma.order.findFirst({
            where: { id: params.orderId, merchantId },
            include: { payments: true, refunds: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const successfulPayment = order.payments.find((p) => p.status === client_1.PaymentStatus.SUCCEEDED);
        if (!successfulPayment) {
            throw new common_1.BadRequestException('No successful payment found for this order');
        }
        const alreadyRefunded = order.refunds
            .filter((r) => r.status === client_1.RefundStatus.SUCCEEDED)
            .reduce((sum, r) => sum + r.amount, 0);
        const maxRefundable = successfulPayment.amount - alreadyRefunded;
        if (params.amount > maxRefundable) {
            throw new common_1.BadRequestException(`Cannot refund ${params.amount}. Maximum refundable: ${maxRefundable}`);
        }
        const pendingRefund = order.refunds.find((r) => r.status === client_1.RefundStatus.PENDING && r.amount === params.amount);
        if (pendingRefund) {
            throw new common_1.ConflictException('A refund for this amount is already pending');
        }
        const merchant = await this.prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } });
        const refund = await this.prisma.refund.create({
            data: {
                merchantId,
                orderId: params.orderId,
                paymentId: successfulPayment.id,
                status: client_1.RefundStatus.PENDING,
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
            if (successfulPayment.method !== 'CASH' && successfulPayment.stripeChargeId) {
                const stripeRefund = await this.stripe.createRefund({
                    chargeId: successfulPayment.stripeChargeId,
                    amount: params.amount,
                    reason: this.mapRefundReason(params.reason),
                    connectedAccountId: merchant.stripeAccountId,
                    idempotencyKey: `stripe-${idempotencyKey}`,
                });
                await this.prisma.refund.update({
                    where: { id: refund.id },
                    data: {
                        stripeRefundId: stripeRefund.id,
                        status: client_1.RefundStatus.SUCCEEDED,
                        processedAt: new Date(),
                    },
                });
            }
            else {
                await this.prisma.refund.update({
                    where: { id: refund.id },
                    data: { status: client_1.RefundStatus.SUCCEEDED, processedAt: new Date() },
                });
            }
            const totalRefunded = alreadyRefunded + params.amount;
            const isFullRefund = totalRefunded >= successfulPayment.amount;
            await this.prisma.order.update({
                where: { id: params.orderId },
                data: {
                    status: isFullRefund ? client_1.OrderStatus.REFUNDED : client_1.OrderStatus.PARTIALLY_REFUNDED,
                },
            });
            if (params.restoreInventory !== false) {
                const itemsToRestore = params.items?.map((item) => ({
                    productId: item.orderItemId,
                    quantity: item.quantity,
                }));
                await this.inventoryService.restoreOrderInventory(params.orderId, merchantId).catch((e) => this.logger.error('Inventory restore failed:', e));
            }
            await this.auditService.log({
                merchantId,
                action: client_1.AuditAction.PAYMENT_REFUND,
                resource: 'refund',
                resourceId: refund.id,
                after: { amount: params.amount, orderId: params.orderId },
            });
            const result = await this.prisma.refund.findUniqueOrThrow({ where: { id: refund.id } });
            await this.redis.setIdempotencyKey(idempotencyKey, JSON.stringify(result));
            return result;
        }
        catch (error) {
            await this.prisma.refund.update({
                where: { id: refund.id },
                data: {
                    status: client_1.RefundStatus.FAILED,
                    failureReason: error.message,
                },
            });
            throw error;
        }
    }
    async getRefunds(merchantId, orderId) {
        return this.prisma.refund.findMany({
            where: { merchantId, ...(orderId && { orderId }) },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    mapRefundReason(reason) {
        if (!reason)
            return 'requested_by_customer';
        if (reason.toLowerCase().includes('duplicate'))
            return 'duplicate';
        if (reason.toLowerCase().includes('fraud'))
            return 'fraudulent';
        return 'requested_by_customer';
    }
};
exports.RefundsService = RefundsService;
exports.RefundsService = RefundsService = RefundsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stripe_service_1.StripeService,
        redis_service_1.RedisService,
        inventory_service_1.InventoryService,
        audit_service_1.AuditService])
], RefundsService);
//# sourceMappingURL=refunds.service.js.map