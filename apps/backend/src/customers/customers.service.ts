import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(merchantId: string, data: {
    firstName: string; lastName?: string; email?: string; phone?: string;
    addressLine1?: string; city?: string; state?: string; postalCode?: string;
    country?: string; notes?: string; tags?: string[];
  }) {
    return this.prisma.customer.create({ data: { merchantId, ...data } });
  }

  async findAll(merchantId: string, params: { page?: number; limit?: number; search?: string }) {
    const { page, limit, skip } = getPaginationParams(params);

    const where = {
      merchantId,
      deletedAt: null,
      ...(params.search && {
        OR: [
          { firstName: { contains: params.search, mode: 'insensitive' as const } },
          { lastName: { contains: params.search, mode: 'insensitive' as const } },
          { email: { contains: params.search, mode: 'insensitive' as const } },
          { phone: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return paginate(customers, total, page, limit);
  }

  async findById(merchantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, merchantId, deletedAt: null },
      include: {
        orders: {
          where: { status: 'PAID' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { payments: { select: { amount: true, method: true } } },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(merchantId: string, id: string, data: object) {
    await this.findById(merchantId, id);
    return this.prisma.customer.update({ where: { id }, data });
  }

  async delete(merchantId: string, id: string) {
    await this.findById(merchantId, id);
    await this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }
}
