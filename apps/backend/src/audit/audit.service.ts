import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditAction } from '@prisma/client';

interface AuditLogParams {
  merchantId?: string;
  userId?: string;
  employeeId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams) {
    return this.prisma.auditLog.create({
      data: {
        merchantId: params.merchantId,
        userId: params.userId,
        employeeId: params.employeeId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        before: params.before as object | undefined,
        after: params.after as object | undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        notes: params.notes,
      },
    });
  }

  async findAll(merchantId: string, params?: {
    action?: AuditAction;
    resource?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where = {
      merchantId,
      ...(params?.action && { action: params.action }),
      ...(params?.resource && { resource: params.resource }),
      ...(params?.userId && { userId: params.userId }),
      ...(params?.startDate && params?.endDate && {
        createdAt: { gte: params.startDate, lte: params.endDate },
      }),
    };

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params?.limit || 100,
      skip: params?.offset || 0,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
    });
  }
}
