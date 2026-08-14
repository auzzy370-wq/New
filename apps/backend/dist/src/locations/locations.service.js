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
var LocationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const stripe_service_1 = require("../common/stripe/stripe.service");
let LocationsService = LocationsService_1 = class LocationsService {
    constructor(prisma, stripe) {
        this.prisma = prisma;
        this.stripe = stripe;
        this.logger = new common_1.Logger(LocationsService_1.name);
    }
    async create(merchantId, dto) {
        const merchant = await this.prisma.merchant.findUniqueOrThrow({
            where: { id: merchantId },
        });
        const locationCount = await this.prisma.location.count({ where: { merchantId } });
        let stripeLocationId;
        if (merchant.stripeAccountId &&
            dto.addressLine1 &&
            dto.city &&
            dto.state &&
            dto.postalCode) {
            try {
                const stripeLocation = await this.stripe.createTerminalLocation({
                    displayName: dto.name,
                    address: {
                        line1: dto.addressLine1,
                        city: dto.city,
                        state: dto.state,
                        postalCode: dto.postalCode,
                        country: dto.country || 'US',
                    },
                    connectedAccountId: merchant.stripeAccountId,
                });
                stripeLocationId = stripeLocation.id;
            }
            catch (err) {
                this.logger.warn(`Could not create Stripe Terminal location: ${err.message}`);
            }
        }
        return this.prisma.location.create({
            data: {
                merchantId,
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                addressLine1: dto.addressLine1,
                addressLine2: dto.addressLine2,
                city: dto.city,
                state: dto.state,
                postalCode: dto.postalCode,
                country: dto.country || 'US',
                timezone: dto.timezone || 'America/New_York',
                taxRate: dto.taxRatePercent !== undefined ? dto.taxRatePercent / 100 : 0,
                isDefault: locationCount === 0,
                stripeLocationId,
            },
        });
    }
    async findAll(merchantId) {
        return this.prisma.location.findMany({
            where: { merchantId, deletedAt: null },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
            include: {
                _count: {
                    select: { orders: true, devices: true, employees: true },
                },
            },
        });
    }
    async findById(merchantId, id) {
        const location = await this.prisma.location.findFirst({
            where: { id, merchantId, deletedAt: null },
            include: {
                devices: { where: { status: { not: 'DECOMMISSIONED' } } },
                taxes: true,
                _count: { select: { orders: true } },
            },
        });
        if (!location)
            throw new common_1.NotFoundException('Location not found');
        return location;
    }
    async update(merchantId, id, dto) {
        await this.findById(merchantId, id);
        const updateData = {};
        if (dto.name !== undefined)
            updateData.name = dto.name;
        if (dto.email !== undefined)
            updateData.email = dto.email;
        if (dto.phone !== undefined)
            updateData.phone = dto.phone;
        if (dto.addressLine1 !== undefined)
            updateData.addressLine1 = dto.addressLine1;
        if (dto.addressLine2 !== undefined)
            updateData.addressLine2 = dto.addressLine2;
        if (dto.city !== undefined)
            updateData.city = dto.city;
        if (dto.state !== undefined)
            updateData.state = dto.state;
        if (dto.postalCode !== undefined)
            updateData.postalCode = dto.postalCode;
        if (dto.country !== undefined)
            updateData.country = dto.country;
        if (dto.timezone !== undefined)
            updateData.timezone = dto.timezone;
        if (dto.isActive !== undefined)
            updateData.isActive = dto.isActive;
        if (dto.taxRatePercent !== undefined)
            updateData.taxRate = dto.taxRatePercent / 100;
        return this.prisma.location.update({ where: { id }, data: updateData });
    }
    async delete(merchantId, id) {
        const location = await this.findById(merchantId, id);
        if (location.isDefault) {
            const otherLocations = await this.prisma.location.count({
                where: { merchantId, deletedAt: null, id: { not: id } },
            });
            if (otherLocations > 0) {
                throw new common_1.BadRequestException('Cannot delete default location while other locations exist. Set another location as default first.');
            }
        }
        return this.prisma.location.update({
            where: { id },
            data: { deletedAt: new Date(), isActive: false },
        });
    }
    async setDefault(merchantId, id) {
        await this.findById(merchantId, id);
        await this.prisma.location.updateMany({
            where: { merchantId },
            data: { isDefault: false },
        });
        return this.prisma.location.update({
            where: { id },
            data: { isDefault: true },
        });
    }
    async getConnectionToken(merchantId, locationId) {
        const merchant = await this.prisma.merchant.findUniqueOrThrow({
            where: { id: merchantId },
        });
        if (!merchant.stripeAccountId) {
            throw new common_1.BadRequestException('No Stripe account connected');
        }
        const location = await this.findById(merchantId, locationId);
        return this.stripe.createTerminalConnectionToken(merchant.stripeAccountId, location.stripeLocationId || undefined);
    }
    async getSummary(merchantId) {
        const locations = await this.findAll(merchantId);
        const defaultLocation = locations.find((l) => l.isDefault);
        return {
            total: locations.length,
            active: locations.filter((l) => l.isActive).length,
            defaultLocation: defaultLocation
                ? { id: defaultLocation.id, name: defaultLocation.name }
                : null,
            locations: locations.map((l) => ({
                id: l.id,
                name: l.name,
                city: l.city,
                state: l.state,
                isDefault: l.isDefault,
                isActive: l.isActive,
                stripeConnected: !!l.stripeLocationId,
            })),
        };
    }
};
exports.LocationsService = LocationsService;
exports.LocationsService = LocationsService = LocationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stripe_service_1.StripeService])
], LocationsService);
//# sourceMappingURL=locations.service.js.map