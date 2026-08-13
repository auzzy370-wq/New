import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MerchantStatus, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformStats() {
    const [merchants, activeSubscriptions, totalVolume, pendingDisputes] = await Promise.all([
      this.prisma.merchant.count({ where: { deletedAt: null } }),
      this.prisma.subscription.count({
        where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] } },
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

  async getMerchants(params: { page?: number; limit?: number; search?: string; status?: MerchantStatus }) {
    const where = {
      deletedAt: null,
      ...(params.status && { status: params.status }),
      ...(params.search && {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' as const } },
          { email: { contains: params.search, mode: 'insensitive' as const } },
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

  async suspendMerchant(merchantId: string, reason: string) {
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { status: MerchantStatus.SUSPENDED },
    });
  }

  async activateMerchant(merchantId: string) {
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { status: MerchantStatus.ACTIVE },
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

  async getPlatformRevenue(params: { startDate: Date; endDate: Date }) {
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
}
