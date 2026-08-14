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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const pagination_util_1 = require("../common/utils/pagination.util");
let ProductsService = class ProductsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(merchantId, data) {
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
    async findAll(merchantId, params) {
        const { page, limit, skip } = (0, pagination_util_1.getPaginationParams)(params);
        const where = {
            merchantId,
            deletedAt: null,
            ...(params.categoryId && { categoryId: params.categoryId }),
            ...(params.isActive !== undefined && { isActive: params.isActive }),
            ...(params.search && {
                OR: [
                    { name: { contains: params.search, mode: 'insensitive' } },
                    { sku: { contains: params.search, mode: 'insensitive' } },
                    { barcode: { contains: params.search, mode: 'insensitive' } },
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
        return (0, pagination_util_1.paginate)(products, total, page, limit);
    }
    async findById(merchantId, id) {
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
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        return product;
    }
    async update(merchantId, id, data) {
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
    async delete(merchantId, id) {
        await this.findById(merchantId, id);
        await this.prisma.product.update({
            where: { id },
            data: { deletedAt: new Date(), isActive: false },
        });
        return { success: true };
    }
    async createCategory(merchantId, data) {
        return this.prisma.category.create({ data: { merchantId, ...data } });
    }
    async getCategories(merchantId) {
        return this.prisma.category.findMany({
            where: { merchantId, isActive: true },
            include: { _count: { select: { products: true } } },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map