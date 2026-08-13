import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(merchantId: string, data: {
    name: string; description?: string; sku?: string; barcode?: string;
    price: number; cost?: number; categoryId?: string; imageUrl?: string;
    isTaxable?: boolean; trackInventory?: boolean; isActive?: boolean;
  }) {
    const { price, cost, ...rest } = data;
    return this.prisma.product.create({
      data: {
        merchantId,
        price: price / 100,
        cost: cost ? cost / 100 : undefined,
        ...rest,
      },
      include: { category: true, variants: true, modifierGroups: { include: { modifiers: true } } },
    });
  }

  async findAll(merchantId: string, params: {
    page?: number; limit?: number; categoryId?: string;
    search?: string; isActive?: boolean;
  }) {
    const { page, limit, skip } = getPaginationParams(params);

    const where = {
      merchantId,
      deletedAt: null,
      ...(params.categoryId && { categoryId: params.categoryId }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      ...(params.search && {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' as const } },
          { sku: { contains: params.search, mode: 'insensitive' as const } },
          { barcode: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          category: true,
          variants: { where: { isActive: true } },
          modifierGroups: { include: { modifiers: { where: { isActive: true } } } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(products, total, page, limit);
  }

  async findById(merchantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, merchantId, deletedAt: null },
      include: {
        category: true,
        variants: { where: { isActive: true } },
        modifierGroups: {
          include: { modifiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        taxes: { include: { tax: true } },
        inventory: { include: { location: true } },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(merchantId: string, id: string, data: Partial<{
    name: string; description: string; sku: string; barcode: string;
    price: number; cost: number; categoryId: string; imageUrl: string;
    isTaxable: boolean; trackInventory: boolean; isActive: boolean; sortOrder: number;
  }>) {
    await this.findById(merchantId, id);
    const { price, cost, ...rest } = data;
    return this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(price !== undefined && { price: price / 100 }),
        ...(cost !== undefined && { cost: cost / 100 }),
      },
    });
  }

  async delete(merchantId: string, id: string) {
    await this.findById(merchantId, id);
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { success: true };
  }

  async createCategory(merchantId: string, data: { name: string; description?: string; color?: string }) {
    return this.prisma.category.create({ data: { merchantId, ...data } });
  }

  async getCategories(merchantId: string) {
    return this.prisma.category.findMany({
      where: { merchantId, isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }
}
