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
exports.DevicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const stripe_service_1 = require("../common/stripe/stripe.service");
const client_1 = require("@prisma/client");
let DevicesService = class DevicesService {
    constructor(prisma, stripe) {
        this.prisma = prisma;
        this.stripe = stripe;
    }
    async register(merchantId, data) {
        return this.prisma.device.create({ data: { merchantId, ...data, status: client_1.DeviceStatus.ACTIVE } });
    }
    async findAll(merchantId, locationId) {
        return this.prisma.device.findMany({
            where: { merchantId, ...(locationId && { locationId }), status: { not: client_1.DeviceStatus.DECOMMISSIONED } },
            include: { location: { select: { name: true } } },
        });
    }
    async updateLastSeen(merchantId, deviceId) {
        return this.prisma.device.updateMany({
            where: { id: deviceId, merchantId },
            data: { lastSeenAt: new Date() },
        });
    }
    async getConnectionToken(merchantId, locationId) {
        const merchant = await this.prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } });
        const location = await this.prisma.location.findFirst({ where: { id: locationId, merchantId } });
        if (!merchant.stripeAccountId)
            throw new common_1.NotFoundException('No Stripe account');
        return this.stripe.createTerminalConnectionToken(merchant.stripeAccountId, location?.stripeLocationId || undefined);
    }
};
exports.DevicesService = DevicesService;
exports.DevicesService = DevicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stripe_service_1.StripeService])
], DevicesService);
//# sourceMappingURL=devices.service.js.map