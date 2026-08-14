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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSalesReport(merchantId, params) {
        const where = {
            merchantId,
            status: client_1.OrderStatus.PAID,
            paidAt: { gte: params.startDate, lte: params.endDate },
            ...(params.locationId && { locationId: params.locationId }),
        };
        const [summary, byLocation, byEmployee, byPaymentMethod, topProducts, byHour] = await Promise.all([
            this.prisma.order.aggregate({
                where,
                _sum: { totalAmount: true, tipAmount: true, discountAmount: true, taxAmount: true, subtotalAmount: true },
                _count: true,
                _avg: { totalAmount: true },
            }),
            this.prisma.order.groupBy({
                by: ['locationId'],
                where,
                _sum: { totalAmount: true },
                _count: true,
            }),
            this.prisma.order.groupBy({
                by: ['employeeId'],
                where,
                _sum: { totalAmount: true },
                _count: true,
                orderBy: { _sum: { totalAmount: 'desc' } },
            }),
            this.prisma.payment.groupBy({
                by: ['method'],
                where: { merchantId, status: 'SUCCEEDED', order: { paidAt: { gte: params.startDate, lte: params.endDate } } },
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.orderItem.groupBy({
                by: ['productId', 'name'],
                where: { order: where },
                _sum: { quantity: true, totalAmount: true },
                orderBy: { _sum: { totalAmount: 'desc' } },
                take: 10,
            }),
            this.prisma.$queryRaw `
        SELECT EXTRACT(HOUR FROM paid_at) as hour, COUNT(*) as count, SUM(total_amount) as total
        FROM orders
        WHERE merchant_id = ${merchantId}::uuid
          AND status = 'PAID'
          AND paid_at >= ${params.startDate}
          AND paid_at <= ${params.endDate}
        GROUP BY EXTRACT(HOUR FROM paid_at)
        ORDER BY hour
      `,
        ]);
        return {
            summary: {
                totalRevenue: summary._sum.totalAmount || 0,
                totalSubtotal: summary._sum.subtotalAmount || 0,
                totalTips: summary._sum.tipAmount || 0,
                totalDiscounts: summary._sum.discountAmount || 0,
                totalTax: summary._sum.taxAmount || 0,
                orderCount: summary._count,
                averageOrderValue: summary._avg.totalAmount || 0,
            },
            byLocation,
            byEmployee,
            byPaymentMethod,
            topProducts,
            byHour,
        };
    }
    async getRevenueReport(merchantId, params) {
        const [platformFees, subscriptions, refunds] = await Promise.all([
            this.prisma.platformFee.aggregate({
                where: {
                    merchantId,
                    createdAt: { gte: params.startDate, lte: params.endDate },
                },
                _sum: { feeAmount: true, transactionAmount: true },
                _count: true,
            }),
            this.prisma.invoice.aggregate({
                where: {
                    merchantId,
                    status: 'paid',
                    paidAt: { gte: params.startDate, lte: params.endDate },
                },
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.refund.aggregate({
                where: {
                    merchantId,
                    status: 'SUCCEEDED',
                    processedAt: { gte: params.startDate, lte: params.endDate },
                },
                _sum: { amount: true },
                _count: true,
            }),
        ]);
        return {
            platformFeeRevenue: platformFees._sum.feeAmount || 0,
            transactionVolume: platformFees._sum.transactionAmount || 0,
            transactionCount: platformFees._count,
            subscriptionRevenue: subscriptions._sum.amount || 0,
            refundsTotal: refunds._sum.amount || 0,
            refundCount: refunds._count,
            totalRevenue: (platformFees._sum.feeAmount || 0) + (subscriptions._sum.amount || 0),
        };
    }
    async getDashboardMetrics(merchantId) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const [today, thisMonth, lastMonth, topProducts, lowStock] = await Promise.all([
            this.prisma.order.aggregate({
                where: { merchantId, status: client_1.OrderStatus.PAID, paidAt: { gte: todayStart } },
                _sum: { totalAmount: true, tipAmount: true },
                _count: true,
                _avg: { totalAmount: true },
            }),
            this.prisma.order.aggregate({
                where: { merchantId, status: client_1.OrderStatus.PAID, paidAt: { gte: monthStart } },
                _sum: { totalAmount: true },
                _count: true,
            }),
            this.prisma.order.aggregate({
                where: { merchantId, status: client_1.OrderStatus.PAID, paidAt: { gte: lastMonthStart, lte: lastMonthEnd } },
                _sum: { totalAmount: true },
                _count: true,
            }),
            this.prisma.orderItem.groupBy({
                by: ['productId', 'name'],
                where: { order: { merchantId, status: client_1.OrderStatus.PAID, paidAt: { gte: monthStart } } },
                _sum: { quantity: true, totalAmount: true },
                orderBy: { _sum: { totalAmount: 'desc' } },
                take: 5,
            }),
            this.prisma.inventory.findMany({
                where: { merchantId },
                include: { product: { select: { name: true } }, location: { select: { name: true } } },
            }).then((inv) => inv.filter((i) => i.quantity <= i.lowStockThreshold).slice(0, 10)),
        ]);
        return {
            today: {
                revenue: today._sum.totalAmount || 0,
                tips: today._sum.tipAmount || 0,
                orders: today._count,
                averageOrderValue: today._avg.totalAmount || 0,
            },
            thisMonth: {
                revenue: thisMonth._sum.totalAmount || 0,
                orders: thisMonth._count,
            },
            lastMonth: {
                revenue: lastMonth._sum.totalAmount || 0,
                orders: lastMonth._count,
            },
            topProducts,
            lowStock,
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map