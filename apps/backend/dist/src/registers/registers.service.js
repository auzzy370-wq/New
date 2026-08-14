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
exports.RegistersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let RegistersService = class RegistersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async openSession(merchantId, data) {
        const existing = await this.prisma.registerSession.findFirst({
            where: { merchantId, locationId: data.locationId, status: client_1.RegisterSessionStatus.OPEN },
        });
        if (existing) {
            throw new common_1.BadRequestException('A register session is already open at this location');
        }
        return this.prisma.registerSession.create({
            data: { merchantId, ...data },
        });
    }
    async closeSession(merchantId, sessionId, data) {
        const session = await this.prisma.registerSession.findFirst({
            where: { id: sessionId, merchantId, status: client_1.RegisterSessionStatus.OPEN },
        });
        if (!session)
            throw new common_1.NotFoundException('Open register session not found');
        const cashDifference = data.actualCashAmount - session.expectedCashAmount;
        return this.prisma.registerSession.update({
            where: { id: sessionId },
            data: {
                status: client_1.RegisterSessionStatus.CLOSED,
                actualCashAmount: data.actualCashAmount,
                cashDifference,
                closedAt: new Date(),
                notes: data.notes,
            },
        });
    }
    async getCurrentSession(merchantId, locationId) {
        return this.prisma.registerSession.findFirst({
            where: { merchantId, locationId, status: client_1.RegisterSessionStatus.OPEN },
            include: { employee: { select: { firstName: true, lastName: true } } },
        });
    }
    async getSessions(merchantId, locationId) {
        return this.prisma.registerSession.findMany({
            where: { merchantId, ...(locationId && { locationId }) },
            orderBy: { openedAt: 'desc' },
            take: 50,
            include: {
                location: { select: { name: true } },
                employee: { select: { firstName: true, lastName: true } },
            },
        });
    }
};
exports.RegistersService = RegistersService;
exports.RegistersService = RegistersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RegistersService);
//# sourceMappingURL=registers.service.js.map