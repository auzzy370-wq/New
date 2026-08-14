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
var MerchantsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const stripe_service_1 = require("../common/stripe/stripe.service");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
function createSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}
let MerchantsService = MerchantsService_1 = class MerchantsService {
    constructor(prisma, stripe, configService) {
        this.prisma = prisma;
        this.stripe = stripe;
        this.configService = configService;
        this.logger = new common_1.Logger(MerchantsService_1.name);
    }
    async create(userId, dto) {
        const baseSlug = createSlug(dto.name);
        const slug = await this.generateUniqueSlug(baseSlug);
        const merchant = await this.prisma.$transaction(async (tx) => {
            const m = await tx.merchant.create({
                data: {
                    name: dto.name,
                    slug,
                    email: dto.email,
                    phone: dto.phone,
                    website: dto.website,
                    businessType: dto.businessType,
                    taxId: dto.taxId,
                    currency: dto.currency || 'usd',
                    timezone: dto.timezone || 'America/New_York',
                    addressLine1: dto.addressLine1,
                    addressLine2: dto.addressLine2,
                    city: dto.city,
                    state: dto.state,
                    postalCode: dto.postalCode,
                    country: dto.country || 'US',
                    status: client_1.MerchantStatus.ONBOARDING,
                    platformFeeRate: 0.01,
                },
            });
            await tx.merchantUser.create({
                data: {
                    merchantId: m.id,
                    userId,
                    role: client_1.UserRole.MERCHANT_OWNER,
                    isOwner: true,
                    permissions: [],
                },
            });
            await tx.merchantSettings.create({
                data: {
                    merchantId: m.id,
                    tipPresets: [0.15, 0.18, 0.20, 0.25],
                },
            });
            return m;
        });
        this.logger.log(`Merchant created: ${merchant.name} (${merchant.id})`);
        return merchant;
    }
    async findById(id) {
        const merchant = await this.prisma.merchant.findUnique({
            where: { id, deletedAt: null },
            include: {
                settings: true,
                locations: { where: { deletedAt: null } },
            },
        });
        if (!merchant) {
            throw new common_1.NotFoundException('Merchant not found');
        }
        return merchant;
    }
    async update(id, dto) {
        await this.findById(id);
        return this.prisma.merchant.update({
            where: { id },
            data: {
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                website: dto.website,
                businessType: dto.businessType,
                businessCategory: dto.businessCategory,
                description: dto.description,
                taxId: dto.taxId,
                addressLine1: dto.addressLine1,
                addressLine2: dto.addressLine2,
                city: dto.city,
                state: dto.state,
                postalCode: dto.postalCode,
                country: dto.country,
                timezone: dto.timezone,
                currency: dto.currency,
            },
        });
    }
    async getOnboardingStatus(id) {
        const merchant = await this.findById(id);
        const locations = await this.prisma.location.count({ where: { merchantId: id } });
        const products = await this.prisma.product.count({ where: { merchantId: id } });
        const hasSubscription = await this.prisma.subscription.findFirst({
            where: { merchantId: id },
        });
        return {
            merchant,
            onboardingStep: merchant.onboardingStep,
            onboardingCompleted: merchant.onboardingCompleted,
            checks: {
                merchantCreated: true,
                stripeConnected: merchant.stripeOnboardingComplete,
                subscriptionActive: !!hasSubscription,
                locationCreated: locations > 0,
                productsAdded: products > 0,
                tapToPayEnabled: !!merchant.stripePayoutsEnabled && !!merchant.stripeChargesEnabled,
            },
        };
    }
    async initiateStripeOnboarding(merchantId, frontendUrl) {
        const merchant = await this.findById(merchantId);
        let accountId = merchant.stripeAccountId;
        if (!accountId) {
            const account = await this.stripe.createConnectedAccount({
                email: merchant.email,
                businessType: merchant.businessType === 'individual' ? 'individual' : 'company',
                country: merchant.country,
                merchantId: merchant.id,
            });
            accountId = account.id;
            await this.prisma.merchant.update({
                where: { id: merchantId },
                data: { stripeAccountId: accountId },
            });
        }
        const onboardingLink = await this.stripe.createAccountOnboardingLink(accountId, {
            returnUrl: `${frontendUrl}/onboarding/stripe/return?merchantId=${merchantId}`,
            refreshUrl: `${frontendUrl}/onboarding/stripe/refresh?merchantId=${merchantId}`,
        });
        return { url: onboardingLink.url };
    }
    async handleStripeOnboardingReturn(merchantId) {
        const merchant = await this.findById(merchantId);
        if (!merchant.stripeAccountId) {
            throw new common_1.BadRequestException('Stripe account not initialized');
        }
        const account = await this.stripe.retrieveAccount(merchant.stripeAccountId);
        const isComplete = account.details_submitted &&
            account.charges_enabled &&
            account.payouts_enabled;
        await this.prisma.merchant.update({
            where: { id: merchantId },
            data: {
                stripeAccountStatus: account.charges_enabled ? 'active' : 'pending',
                stripeOnboardingComplete: !!isComplete,
                stripePayoutsEnabled: !!account.payouts_enabled,
                stripeChargesEnabled: !!account.charges_enabled,
                status: isComplete ? client_1.MerchantStatus.ACTIVE : client_1.MerchantStatus.ONBOARDING,
                onboardingStep: isComplete ? Math.max(merchant.onboardingStep, 7) : merchant.onboardingStep,
            },
        });
        return {
            stripeAccountId: merchant.stripeAccountId,
            isComplete,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
        };
    }
    async getStripeLoginLink(merchantId) {
        const merchant = await this.findById(merchantId);
        if (!merchant.stripeAccountId) {
            throw new common_1.BadRequestException('No Stripe account connected');
        }
        const loginLink = await this.stripe.createLoginLink(merchant.stripeAccountId);
        return { url: loginLink.url };
    }
    async updateOnboardingStep(merchantId, step) {
        return this.prisma.merchant.update({
            where: { id: merchantId },
            data: { onboardingStep: step },
        });
    }
    async getUserMerchants(userId) {
        const merchantUsers = await this.prisma.merchantUser.findMany({
            where: { userId },
            include: {
                merchant: {
                    include: {
                        locations: { where: { deletedAt: null, isActive: true } },
                    },
                },
            },
        });
        return merchantUsers
            .filter((mu) => !mu.merchant.deletedAt)
            .map((mu) => ({
            ...mu.merchant,
            role: mu.role,
            isOwner: mu.isOwner,
        }));
    }
    async generateUniqueSlug(baseSlug) {
        let slug = baseSlug;
        let counter = 1;
        while (true) {
            const existing = await this.prisma.merchant.findUnique({ where: { slug } });
            if (!existing)
                return slug;
            slug = `${baseSlug}-${counter++}`;
        }
    }
};
exports.MerchantsService = MerchantsService;
exports.MerchantsService = MerchantsService = MerchantsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stripe_service_1.StripeService,
        config_1.ConfigService])
], MerchantsService);
//# sourceMappingURL=merchants.service.js.map