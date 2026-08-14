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
var OnboardingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const stripe_service_1 = require("../common/stripe/stripe.service");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const onboarding_dto_1 = require("./dto/onboarding.dto");
let OnboardingService = OnboardingService_1 = class OnboardingService {
    constructor(prisma, stripe, configService) {
        this.prisma = prisma;
        this.stripe = stripe;
        this.configService = configService;
        this.logger = new common_1.Logger(OnboardingService_1.name);
    }
    async getStatus(merchantId) {
        const merchant = await this.prisma.merchant.findUnique({
            where: { id: merchantId, deletedAt: null },
            include: {
                settings: true,
                locations: { where: { deletedAt: null }, take: 1 },
                subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
        });
        if (!merchant)
            throw new common_1.NotFoundException('Merchant not found');
        const locationCount = await this.prisma.location.count({ where: { merchantId } });
        const productCount = await this.prisma.product.count({ where: { merchantId } });
        const deviceCount = await this.prisma.device.count({ where: { merchantId } });
        const activeSubscription = merchant.subscriptions.find((s) => s.status === client_1.SubscriptionStatus.ACTIVE || s.status === client_1.SubscriptionStatus.TRIALING);
        const steps = {
            [onboarding_dto_1.OnboardingStep.ACCOUNT_CREATED]: true,
            [onboarding_dto_1.OnboardingStep.BUSINESS_INFO]: !!(merchant.name && merchant.email),
            [onboarding_dto_1.OnboardingStep.BUSINESS_TYPE]: !!merchant.businessType,
            [onboarding_dto_1.OnboardingStep.BUSINESS_ADDRESS]: !!(merchant.city && merchant.postalCode),
            [onboarding_dto_1.OnboardingStep.OWNER_INFO]: !!(merchant.settings?.ownerFirstName || merchant.settings?.ownerLastName),
            [onboarding_dto_1.OnboardingStep.STRIPE_ONBOARDING]: !!merchant.stripeAccountId,
            [onboarding_dto_1.OnboardingStep.KYC_KYB]: !!merchant.stripeOnboardingComplete,
            [onboarding_dto_1.OnboardingStep.BANK_SETUP]: !!merchant.stripePayoutsEnabled,
            [onboarding_dto_1.OnboardingStep.SUBSCRIPTION]: !!activeSubscription,
            [onboarding_dto_1.OnboardingStep.LOCATION]: locationCount > 0,
            [onboarding_dto_1.OnboardingStep.PRODUCTS]: productCount > 0,
            [onboarding_dto_1.OnboardingStep.DEVICE]: deviceCount > 0,
            [onboarding_dto_1.OnboardingStep.TAP_TO_PAY]: !!(merchant.stripeChargesEnabled && deviceCount > 0),
            [onboarding_dto_1.OnboardingStep.TEST_TRANSACTION]: merchant.onboardingStep >= onboarding_dto_1.OnboardingStep.TEST_TRANSACTION,
            [onboarding_dto_1.OnboardingStep.COMPLETE]: merchant.onboardingCompleted,
        };
        const completedSteps = Object.entries(steps)
            .filter(([, done]) => done)
            .map(([step]) => Number(step));
        const currentStep = merchant.onboardingStep || onboarding_dto_1.OnboardingStep.ACCOUNT_CREATED;
        const nextStep = this.getNextIncompleteStep(steps, currentStep);
        return {
            merchantId,
            currentStep,
            nextStep,
            completedSteps,
            onboardingCompleted: merchant.onboardingCompleted,
            steps,
            merchant: {
                id: merchant.id,
                name: merchant.name,
                status: merchant.status,
                stripeAccountId: merchant.stripeAccountId,
                stripeOnboardingComplete: merchant.stripeOnboardingComplete,
                stripeChargesEnabled: merchant.stripeChargesEnabled,
                stripePayoutsEnabled: merchant.stripePayoutsEnabled,
                subscriptionStatus: merchant.subscriptionStatus,
            },
        };
    }
    getNextIncompleteStep(steps, currentStep) {
        for (let s = currentStep; s <= onboarding_dto_1.OnboardingStep.COMPLETE; s++) {
            if (!steps[s])
                return s;
        }
        return onboarding_dto_1.OnboardingStep.COMPLETE;
    }
    async updateBusinessInfo(merchantId, dto) {
        const merchant = await this.prisma.merchant.update({
            where: { id: merchantId },
            data: {
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                website: dto.website,
                onboardingStep: { set: Math.max(onboarding_dto_1.OnboardingStep.BUSINESS_INFO, 0) },
            },
        });
        await this.advanceStep(merchantId, onboarding_dto_1.OnboardingStep.BUSINESS_INFO);
        return merchant;
    }
    async updateBusinessType(merchantId, dto) {
        await this.prisma.merchant.update({
            where: { id: merchantId },
            data: {
                businessType: dto.businessType,
                taxId: dto.taxId,
            },
        });
        await this.advanceStep(merchantId, onboarding_dto_1.OnboardingStep.BUSINESS_TYPE);
        return this.getStatus(merchantId);
    }
    async updateBusinessAddress(merchantId, dto) {
        await this.prisma.merchant.update({
            where: { id: merchantId },
            data: {
                addressLine1: dto.addressLine1,
                addressLine2: dto.addressLine2,
                city: dto.city,
                state: dto.state,
                postalCode: dto.postalCode,
                country: dto.country || 'US',
                timezone: dto.timezone || 'America/New_York',
            },
        });
        await this.advanceStep(merchantId, onboarding_dto_1.OnboardingStep.BUSINESS_ADDRESS);
        return this.getStatus(merchantId);
    }
    async updateOwnerInfo(merchantId, dto) {
        await this.prisma.merchantSettings.upsert({
            where: { merchantId },
            create: {
                merchantId,
                ownerFirstName: dto.firstName,
                ownerLastName: dto.lastName,
                ownerPhone: dto.phone,
                ownerTitle: dto.title,
                tipPresets: [0.15, 0.18, 0.2, 0.25],
            },
            update: {
                ownerFirstName: dto.firstName,
                ownerLastName: dto.lastName,
                ownerPhone: dto.phone,
                ownerTitle: dto.title,
            },
        });
        await this.advanceStep(merchantId, onboarding_dto_1.OnboardingStep.OWNER_INFO);
        return this.getStatus(merchantId);
    }
    async initiateStripeConnect(merchantId) {
        const merchant = await this.prisma.merchant.findUniqueOrThrow({
            where: { id: merchantId },
        });
        const frontendUrl = this.configService.get('app.frontendUrl');
        let accountId = merchant.stripeAccountId;
        if (!accountId) {
            const account = await this.stripe.createConnectedAccount({
                email: merchant.email || '',
                businessType: merchant.businessType === 'individual' ? 'individual' : 'company',
                country: merchant.country || 'US',
                merchantId,
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
        await this.advanceStep(merchantId, onboarding_dto_1.OnboardingStep.STRIPE_ONBOARDING);
        return { url: onboardingLink.url, accountId };
    }
    async handleStripeConnectReturn(merchantId) {
        const merchant = await this.prisma.merchant.findUniqueOrThrow({
            where: { id: merchantId },
        });
        if (!merchant.stripeAccountId) {
            throw new common_1.BadRequestException('Stripe account not initialized');
        }
        const account = await this.stripe.retrieveAccount(merchant.stripeAccountId);
        const isComplete = account.details_submitted &&
            account.charges_enabled &&
            account.payouts_enabled;
        const updateData = {
            stripeAccountStatus: account.charges_enabled ? 'active' : 'pending',
            stripeOnboardingComplete: !!isComplete,
            stripePayoutsEnabled: !!account.payouts_enabled,
            stripeChargesEnabled: !!account.charges_enabled,
        };
        if (isComplete) {
            updateData.status = client_1.MerchantStatus.ACTIVE;
        }
        await this.prisma.merchant.update({
            where: { id: merchantId },
            data: updateData,
        });
        if (account.payouts_enabled) {
            await this.advanceStep(merchantId, onboarding_dto_1.OnboardingStep.BANK_SETUP);
        }
        else if (account.charges_enabled) {
            await this.advanceStep(merchantId, onboarding_dto_1.OnboardingStep.KYC_KYB);
        }
        return {
            stripeAccountId: merchant.stripeAccountId,
            isComplete,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
        };
    }
    async createOnboardingLocation(merchantId, dto) {
        const merchant = await this.prisma.merchant.findUniqueOrThrow({
            where: { id: merchantId },
        });
        const locationCount = await this.prisma.location.count({ where: { merchantId } });
        let stripeLocationId;
        if (merchant.stripeAccountId && dto.addressLine1 && dto.city && dto.state && dto.postalCode) {
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
                this.logger.warn(`Failed to create Stripe Terminal location: ${err.message}`);
            }
        }
        const location = await this.prisma.location.create({
            data: {
                merchantId,
                name: dto.name,
                addressLine1: dto.addressLine1,
                addressLine2: dto.addressLine2,
                city: dto.city,
                state: dto.state,
                postalCode: dto.postalCode,
                country: dto.country || 'US',
                timezone: dto.timezone || 'America/New_York',
                phone: dto.phone,
                email: dto.email,
                taxRate: dto.defaultTaxRate ? dto.defaultTaxRate / 100 : 0,
                isDefault: locationCount === 0,
                stripeLocationId,
            },
        });
        await this.advanceStep(merchantId, onboarding_dto_1.OnboardingStep.LOCATION);
        return location;
    }
    async markTestTransactionComplete(merchantId) {
        await this.advanceStep(merchantId, onboarding_dto_1.OnboardingStep.TEST_TRANSACTION);
        return this.getStatus(merchantId);
    }
    async completeOnboarding(merchantId) {
        const status = await this.getStatus(merchantId);
        const requiredSteps = [
            onboarding_dto_1.OnboardingStep.BUSINESS_INFO,
            onboarding_dto_1.OnboardingStep.STRIPE_ONBOARDING,
            onboarding_dto_1.OnboardingStep.SUBSCRIPTION,
            onboarding_dto_1.OnboardingStep.LOCATION,
        ];
        const missingRequired = requiredSteps.filter((s) => !status.steps[s]);
        if (missingRequired.length > 0) {
            throw new common_1.BadRequestException(`Cannot complete onboarding. Missing required steps: ${missingRequired.join(', ')}`);
        }
        await this.prisma.merchant.update({
            where: { id: merchantId },
            data: {
                onboardingCompleted: true,
                onboardingStep: onboarding_dto_1.OnboardingStep.COMPLETE,
                status: client_1.MerchantStatus.ACTIVE,
            },
        });
        this.logger.log(`Onboarding completed for merchant ${merchantId}`);
        return this.getStatus(merchantId);
    }
    async advanceStep(merchantId, completedStep) {
        const merchant = await this.prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { onboardingStep: true },
        });
        if (!merchant)
            return;
        const nextStep = completedStep + 1;
        if (nextStep > merchant.onboardingStep) {
            await this.prisma.merchant.update({
                where: { id: merchantId },
                data: { onboardingStep: nextStep },
            });
        }
    }
};
exports.OnboardingService = OnboardingService;
exports.OnboardingService = OnboardingService = OnboardingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stripe_service_1.StripeService,
        config_1.ConfigService])
], OnboardingService);
//# sourceMappingURL=onboarding.service.js.map