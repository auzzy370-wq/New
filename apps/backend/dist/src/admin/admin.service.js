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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let AdminService = class AdminService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPlatformStats() {
        const [merchants, activeSubscriptions, totalVolume, pendingDisputes] = await Promise.all([
            this.prisma.merchant.count({ where: { deletedAt: null } }),
            this.prisma.subscription.count({
                where: { status: { in: [client_1.SubscriptionStatus.ACTIVE, client_1.SubscriptionStatus.TRIALING] } },
            }),
            this.prisma.payment.aggregate({
                where: { status: 'SUCCEEDED' },
                _sum: { amount: true },
            }),
            this.prisma.dispute.count({ where: { status: 'NEEDS_RESPONSE' } }),
        ]);
        const mrr = activeSubscriptions * 2500;
        return {
            merchants,
            activeSubscriptions,
            mrr,
            arr: mrr * 12,
            totalTransactionVolume: totalVolume._sum.amount || 0,
            pendingDisputes,
        };
    }
    async getMerchants(params) {
        const where = {
            deletedAt: null,
            ...(params.status && { status: params.status }),
            ...(params.search && {
                OR: [
                    { name: { contains: params.search, mode: 'insensitive' } },
                    { email: { contains: params.search, mode: 'insensitive' } },
                ],
            }),
        };
        const limit = params.limit || 20;
        const skip = ((params.page || 1) - 1) * limit;
        const [merchants, total] = await Promise.all([
            this.prisma.merchant.findMany({
                where, skip, take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
                    _count: { select: { orders: true, locations: true } },
                },
            }),
            this.prisma.merchant.count({ where }),
        ]);
        return { merchants, total };
    }
    async suspendMerchant(merchantId, reason) {
        return this.prisma.merchant.update({
            where: { id: merchantId },
            data: { status: client_1.MerchantStatus.SUSPENDED },
        });
    }
    async activateMerchant(merchantId) {
        return this.prisma.merchant.update({
            where: { id: merchantId },
            data: { status: client_1.MerchantStatus.ACTIVE },
        });
    }
    async getWebhookStats() {
        const [total, failed, pending] = await Promise.all([
            this.prisma.webhookEvent.count(),
            this.prisma.webhookEvent.count({ where: { status: 'FAILED' } }),
            this.prisma.webhookEvent.count({ where: { status: 'PENDING' } }),
        ]);
        return { total, failed, pending, successRate: total > 0 ? ((total - failed) / total) * 100 : 100 };
    }
    async getPlatformRevenue(params) {
        const [fees, subscriptions] = await Promise.all([
            this.prisma.platformFee.aggregate({
                where: { createdAt: { gte: params.startDate, lte: params.endDate } },
                _sum: { feeAmount: true, transactionAmount: true },
            }),
            this.prisma.invoice.aggregate({
                where: { status: 'paid', paidAt: { gte: params.startDate, lte: params.endDate } },
                _sum: { amount: true },
                _count: true,
            }),
        ]);
        return {
            platformFeeRevenue: fees._sum.feeAmount || 0,
            transactionVolume: fees._sum.transactionAmount || 0,
            subscriptionRevenue: subscriptions._sum.amount || 0,
            subscriptionCount: subscriptions._count,
            totalRevenue: (fees._sum.feeAmount || 0) + (subscriptions._sum.amount || 0),
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map