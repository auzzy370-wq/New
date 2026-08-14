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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const pagination_util_1 = require("../common/utils/pagination.util");
let CustomersService = class CustomersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(merchantId, data) {
        return this.prisma.customer.create({ data: { merchantId, ...data } });
    }
    async findAll(merchantId, params) {
        const { page, limit, skip } = (0, pagination_util_1.getPaginationParams)(params);
        const where = {
            merchantId,
            deletedAt: null,
            ...(params.search && {
                OR: [
                    { firstName: { contains: params.search, mode: 'insensitive' } },
                    { lastName: { contains: params.search, mode: 'insensitive' } },
                    { email: { contains: params.search, mode: 'insensitive' } },
                    { phone: { contains: params.search, mode: 'insensitive' } },
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
        return (0, pagination_util_1.paginate)(customers, total, page, limit);
    }
    async findById(merchantId, id) {
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
        if (!customer)
            throw new common_1.NotFoundException('Customer not found');
        return customer;
    }
    async update(merchantId, id, data) {
        await this.findById(merchantId, id);
        return this.prisma.customer.update({ where: { id }, data });
    }
    async delete(merchantId, id) {
        await this.findById(merchantId, id);
        await this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
        return { success: true };
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map