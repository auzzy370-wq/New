import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { InventoryMovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getInventory(merchantId: string, locationId?: string, productId?: string) {
    return this.prisma.inventory.findMany({
      where: {
        merchantId,
        ...(locationId && { locationId }),
        ...(productId && { productId }),
      },
      include: {
        product: { select: { name: true, sku: true, imageUrl: true } },
        variant: { select: { name: true, sku: true } },
        location: { select: { name: true } },
      },
      orderBy: { product: { name: 'asc' } },
    });
  }

  async getLowStock(merchantId: string) {
    const inventory = await this.prisma.inventory.findMany({
      where: { merchantId },
      include: { product: true, location: true },
    });

    return inventory.filter((i) => i.quantity <= i.lowStockThreshold);
  }

  async adjust(merchantId: string, params: {
    locationId: string;
    productId: string;
    variantId?: string;
    quantity: number;
    type: InventoryMovementType;
    employeeId?: string;
    orderId?: string;
    notes?: string;
  }) {
    const inventory = await this.prisma.inventory.findFirst({
      where: {
        locationId: params.locationId,
        productId: params.productId,
        variantId: params.variantId || null,
      },
    });

    const currentQty = inventory?.quantity || 0;
    const newQty = currentQty + params.quantity;

    if (newQty < 0) {
      const product = await this.prisma.product.findUniqueOrThrow({
        where: { id: params.productId },
      });
      if (!product.allowNegativeInventory) {
        throw new BadRequestException(`Insufficient inventory. Available: ${currentQty}`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let inv = inventory;

      if (!inv) {
        inv = await tx.inventory.create({
          data: {
            merchantId,
            locationId: params.locationId,
            productId: params.productId,
            variantId: params.variantId,
            quantity: 0,
          },
        });
      }

      const updated = await tx.inventory.update({
        where: { id: inv.id },
        data: { quantity: newQty },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryId: inv.id,
          merchantId,
          type: params.type,
          quantity: params.quantity,
          quantityBefore: currentQty,
          quantityAfter: newQty,
          orderId: params.orderId,
          employeeId: params.employeeId,
          notes: params.notes,
        },
      });

      return updated;
    });
  }

  async getMovements(merchantId: string, inventoryId?: string, productId?: string) {
    return this.prisma.inventoryMovement.findMany({
      where: {
        merchantId,
        ...(inventoryId && { inventoryId }),
        ...(productId && { inventory: { productId } }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        inventory: { include: { product: { select: { name: true } } } },
      },
    });
  }

  /**
   * Called after a successful payment to decrement inventory
   */
  async processOrderInventory(orderId: string, merchantId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });

    const promises = order.items.map((item) => {
      if (!item.productId || !item.product?.trackInventory) return Promise.resolve();

      return this.adjust(merchantId, {
        locationId: order.locationId,
        productId: item.productId,
        variantId: item.variantId || undefined,
        quantity: -item.quantity,
        type: InventoryMovementType.SALE,
        orderId,
        notes: `Sale - Order #${order.orderNumber}`,
      }).catch(() => {
        // Log but don't fail - inventory is a soft requirement
      });
    });

    await Promise.all(promises);
  }

  /**
   * Called on refund to restore inventory
   */
  async restoreOrderInventory(orderId: string, merchantId: string, items?: Array<{ productId: string; variantId?: string; quantity: number }>) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });

    const toRestore = items || (await this.prisma.orderItem.findMany({
      where: { orderId },
      include: { product: true },
    })).filter((i) => i.productId && i.product?.trackInventory)
      .map((i) => ({ productId: i.productId!, variantId: i.variantId || undefined, quantity: i.quantity }));

    for (const item of toRestore) {
      await this.adjust(merchantId, {
        locationId: order.locationId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        type: InventoryMovementType.RETURN,
        orderId,
        notes: `Refund - Order #${order.orderNumber}`,
      }).catch(() => {});
    }
  }
}
