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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
let AuditService = class AuditService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(params) {
        return this.prisma.auditLog.create({
            data: {
                merchantId: params.merchantId,
                userId: params.userId,
                employeeId: params.employeeId,
                action: params.action,
                resource: params.resource,
                resourceId: params.resourceId,
                before: params.before,
                after: params.after,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
                notes: params.notes,
            },
        });
    }
    async findAll(merchantId, params) {
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
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map