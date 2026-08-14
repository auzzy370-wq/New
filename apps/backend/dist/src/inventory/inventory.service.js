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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let InventoryService = class InventoryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getInventory(merchantId, locationId, productId) {
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
    async getLowStock(merchantId) {
        const inventory = await this.prisma.inventory.findMany({
            where: { merchantId },
            include: { product: true, location: true },
        });
        return inventory.filter((i) => i.quantity <= i.lowStockThreshold);
    }
    async adjust(merchantId, params) {
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
                throw new common_1.BadRequestException(`Insufficient inventory. Available: ${currentQty}`);
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
    async getMovements(merchantId, inventoryId, productId) {
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
    async processOrderInventory(orderId, merchantId) {
        const order = await this.prisma.order.findUniqueOrThrow({
            where: { id: orderId },
            include: { items: { include: { product: true } } },
        });
        const promises = order.items.map((item) => {
            if (!item.productId || !item.product?.trackInventory)
                return Promise.resolve();
            return this.adjust(merchantId, {
                locationId: order.locationId,
                productId: item.productId,
                variantId: item.variantId || undefined,
                quantity: -item.quantity,
                type: client_1.InventoryMovementType.SALE,
                orderId,
                notes: `Sale - Order #${order.orderNumber}`,
            }).catch(() => {
            });
        });
        await Promise.all(promises);
    }
    async restoreOrderInventory(orderId, merchantId, items) {
        const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
        const toRestore = items || (await this.prisma.orderItem.findMany({
            where: { orderId },
            include: { product: true },
        })).filter((i) => i.productId && i.product?.trackInventory)
            .map((i) => ({ productId: i.productId, variantId: i.variantId || undefined, quantity: i.quantity }));
        for (const item of toRestore) {
            await this.adjust(merchantId, {
                locationId: order.locationId,
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                type: client_1.InventoryMovementType.RETURN,
                orderId,
                notes: `Refund - Order #${order.orderNumber}`,
            }).catch(() => { });
        }
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map