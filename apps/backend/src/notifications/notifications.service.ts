import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    merchantId?: string;
    userId?: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }) {
    return this.prisma.notification.create({
      data: {
        merchantId: params.merchantId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data as object | undefined,
      },
    });
  }

  async findAll(params: { merchantId?: string; userId?: string; unreadOnly?: boolean }) {
    return this.prisma.notification.findMany({
      where: {
        merchantId: params.merchantId,
        userId: params.userId,
        ...(params.unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(merchantId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { merchantId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
