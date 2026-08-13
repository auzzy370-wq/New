import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

interface CreateOrderItem {
  productId?: string;
  variantId?: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  taxId?: string;
  discountAmount?: number;
  notes?: string;
  modifiers?: Array<{ modifierId?: string; name: string; price: number; quantity?: number }>;
}

interface CreateOrderDto {
  locationId: string;
  employeeId?: string;
  customerId?: string;
  deviceId?: string;
  items: CreateOrderItem[];
  discountAmount?: number;
  discountCode?: string;
  discountType?: string;
  discountValue?: number;
  tipAmount?: number;
  notes?: string;
  currency?: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(merchantId: string, dto: CreateOrderDto) {
    const orderNumber = await this.generateOrderNumber(merchantId);

    // Calculate totals (all amounts in cents)
    let subtotal = 0;
    let taxTotal = 0;

    const itemsData = [];

    for (const item of dto.items) {
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemDiscount = item.discountAmount || 0;
      const itemTax = item.taxId
        ? await this.calculateItemTax(item.unitPrice * item.quantity, item.taxId)
        : 0;
      const itemTotal = itemSubtotal - itemDiscount + itemTax;

      subtotal += itemSubtotal;
      taxTotal += itemTax;

      itemsData.push({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: itemDiscount,
        taxAmount: itemTax,
        totalAmount: itemTotal,
        taxId: item.taxId,
        notes: item.notes,
        modifiers: item.modifiers
          ? {
              create: item.modifiers.map((m) => ({
                modifierId: m.modifierId,
                name: m.name,
                price: m.price,
                quantity: m.quantity || 1,
              })),
            }
          : undefined,
      });
    }

    const discountAmount = dto.discountAmount || 0;
    const tipAmount = dto.tipAmount || 0;
    const total = subtotal - discountAmount + taxTotal + tipAmount;

    const order = await this.prisma.order.create({
      data: {
        merchantId,
        locationId: dto.locationId,
        employeeId: dto.employeeId,
        customerId: dto.customerId,
        deviceId: dto.deviceId,
        orderNumber,
        status: OrderStatus.DRAFT,
        subtotalAmount: subtotal,
        discountAmount,
        taxAmount: taxTotal,
        tipAmount,
        totalAmount: total,
        discountCode: dto.discountCode,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        notes: dto.notes,
        currency: dto.currency || 'usd',
        items: { create: itemsData },
      },
      include: {
        items: { include: { modifiers: true, product: true } },
        customer: true,
        location: true,
        employee: true,
      },
    });

    return order;
  }

  async findAll(merchantId: string, params: {
    page?: number; limit?: number; status?: OrderStatus;
    locationId?: string; customerId?: string; employeeId?: string;
    search?: string; startDate?: Date; endDate?: Date;
  }) {
    const { page, limit, skip } = getPaginationParams(params);

    const where = {
      merchantId,
      ...(params.status && { status: params.status }),
      ...(params.locationId && { locationId: params.locationId }),
      ...(params.customerId && { customerId: params.customerId }),
      ...(params.employeeId && { employeeId: params.employeeId }),
      ...(params.search && {
        orderNumber: { contains: params.search, mode: 'insensitive' as const },
      }),
      ...(params.startDate && params.endDate && {
        createdAt: { gte: params.startDate, lte: params.endDate },
      }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { firstName: true, lastName: true, email: true } },
          location: { select: { name: true } },
          employee: { select: { firstName: true, lastName: true } },
          payments: { select: { status: true, method: true, amount: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(orders, total, page, limit);
  }

  async findById(merchantId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, merchantId },
      include: {
        items: {
          include: {
            product: { select: { name: true, imageUrl: true, sku: true } },
            variant: { select: { name: true } },
            modifiers: true,
            tax: true,
          },
        },
        customer: true,
        location: true,
        employee: true,
        device: true,
        payments: {
          include: { platformFee: true },
          orderBy: { createdAt: 'desc' },
        },
        refunds: { orderBy: { createdAt: 'desc' } },
        receipts: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(merchantId: string, id: string, status: OrderStatus) {
    const order = await this.findById(merchantId, id);

    const validTransitions: Record<string, OrderStatus[]> = {
      DRAFT: [OrderStatus.PENDING, OrderStatus.CANCELLED],
      PENDING: [OrderStatus.PAID, OrderStatus.FAILED, OrderStatus.CANCELLED],
      PAID: [OrderStatus.REFUNDED, OrderStatus.PARTIALLY_REFUNDED, OrderStatus.DISPUTED],
      FAILED: [OrderStatus.PENDING, OrderStatus.CANCELLED],
    };

    const allowed = validTransitions[order.status];
    if (allowed && !allowed.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${order.status} to ${status}`);
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status,
        ...(status === OrderStatus.PAID && { paidAt: new Date() }),
        ...(status === OrderStatus.CANCELLED && { cancelledAt: new Date() }),
      },
    });
  }

  async getStats(merchantId: string, locationId?: string, startDate?: Date, endDate?: Date) {
    const where = {
      merchantId,
      status: OrderStatus.PAID,
      ...(locationId && { locationId }),
      ...(startDate && endDate && { paidAt: { gte: startDate, lte: endDate } }),
    };

    const [orderCount, totals, topProducts] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        where,
        _sum: { totalAmount: true, tipAmount: true, discountAmount: true, taxAmount: true },
        _avg: { totalAmount: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId', 'name'],
        where: { order: where },
        _sum: { quantity: true, totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      orderCount,
      totalRevenue: totals._sum.totalAmount || 0,
      totalTips: totals._sum.tipAmount || 0,
      totalDiscounts: totals._sum.discountAmount || 0,
      totalTax: totals._sum.taxAmount || 0,
      averageOrderValue: totals._avg.totalAmount || 0,
      topProducts,
    };
  }

  private async calculateItemTax(amountCents: number, taxId: string): Promise<number> {
    const tax = await this.prisma.tax.findUnique({ where: { id: taxId } });
    if (!tax) return 0;
    return Math.round(amountCents * Number(tax.rate));
  }

  private async generateOrderNumber(merchantId: string): Promise<string> {
    const today = new Date();
    const prefix = `ORD-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const count = await this.prisma.order.count({
      where: { merchantId, createdAt: { gte: new Date(today.toDateString()) } },
    });

    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }
}
