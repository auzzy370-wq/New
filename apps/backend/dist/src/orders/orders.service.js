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
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const pagination_util_1 = require("../common/utils/pagination.util");
let OrdersService = OrdersService_1 = class OrdersService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(OrdersService_1.name);
    }
    async create(merchantId, dto) {
        const orderNumber = await this.generateOrderNumber(merchantId);
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
                status: client_1.OrderStatus.DRAFT,
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
    async findAll(merchantId, params) {
        const { page, limit, skip } = (0, pagination_util_1.getPaginationParams)(params);
        const where = {
            merchantId,
            ...(params.status && { status: params.status }),
            ...(params.locationId && { locationId: params.locationId }),
            ...(params.customerId && { customerId: params.customerId }),
            ...(params.employeeId && { employeeId: params.employeeId }),
            ...(params.search && {
                orderNumber: { contains: params.search, mode: 'insensitive' },
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
        return (0, pagination_util_1.paginate)(orders, total, page, limit);
    }
    async findById(merchantId, id) {
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
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return order;
    }
    async updateStatus(merchantId, id, status) {
        const order = await this.findById(merchantId, id);
        const validTransitions = {
            DRAFT: [client_1.OrderStatus.PENDING, client_1.OrderStatus.CANCELLED],
            PENDING: [client_1.OrderStatus.PAID, client_1.OrderStatus.FAILED, client_1.OrderStatus.CANCELLED],
            PAID: [client_1.OrderStatus.REFUNDED, client_1.OrderStatus.PARTIALLY_REFUNDED, client_1.OrderStatus.DISPUTED],
            FAILED: [client_1.OrderStatus.PENDING, client_1.OrderStatus.CANCELLED],
        };
        const allowed = validTransitions[order.status];
        if (allowed && !allowed.includes(status)) {
            throw new common_1.BadRequestException(`Cannot transition from ${order.status} to ${status}`);
        }
        return this.prisma.order.update({
            where: { id },
            data: {
                status,
                ...(status === client_1.OrderStatus.PAID && { paidAt: new Date() }),
                ...(status === client_1.OrderStatus.CANCELLED && { cancelledAt: new Date() }),
            },
        });
    }
    async getStats(merchantId, locationId, startDate, endDate) {
        const where = {
            merchantId,
            status: client_1.OrderStatus.PAID,
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
    async calculateItemTax(amountCents, taxId) {
        const tax = await this.prisma.tax.findUnique({ where: { id: taxId } });
        if (!tax)
            return 0;
        return Math.round(amountCents * Number(tax.rate));
    }
    async generateOrderNumber(merchantId) {
        const today = new Date();
        const prefix = `ORD-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        const count = await this.prisma.order.count({
            where: { merchantId, createdAt: { gte: new Date(today.toDateString()) } },
        });
        return `${prefix}-${String(count + 1).padStart(4, '0')}`;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map