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
var SubscriptionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const stripe_service_1 = require("../common/stripe/stripe.service");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
let SubscriptionsService = SubscriptionsService_1 = class SubscriptionsService {
    constructor(prisma, stripe, configService) {
        this.prisma = prisma;
        this.stripe = stripe;
        this.configService = configService;
        this.logger = new common_1.Logger(SubscriptionsService_1.name);
    }
    async createSubscription(merchantId, params) {
        const merchant = await this.prisma.merchant.findUniqueOrThrow({
            where: { id: merchantId },
            include: { subscriptions: true },
        });
        const existing = merchant.subscriptions.find((s) => s.status === client_1.SubscriptionStatus.ACTIVE ||
            s.status === client_1.SubscriptionStatus.TRIALING);
        if (existing) {
            throw new common_1.BadRequestException('Merchant already has an active subscription');
        }
        let stripeCustomerId = merchant.subscriptions[0]?.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await this.stripe.createStripeCustomer({
                email: params.email,
                name: params.merchantName,
                metadata: { merchantId },
            });
            stripeCustomerId = customer.id;
        }
        const priceId = this.configService.get('stripe.subscriptionPriceId');
        const idempotencyKey = `sub-${merchantId}-${(0, uuid_1.v4)()}`;
        let stripeSubscription;
        if (params.paymentMethodId) {
            await this.stripe.attachPaymentMethod(params.paymentMethodId, stripeCustomerId);
            await this.stripe.setDefaultPaymentMethod(stripeCustomerId, params.paymentMethodId);
            stripeSubscription = await this.stripe.createSubscriptionWithPaymentMethod({
                customerId: stripeCustomerId,
                priceId,
                paymentMethodId: params.paymentMethodId,
                trialPeriodDays: 14,
                idempotencyKey,
                metadata: { merchantId },
            });
        }
        else {
            stripeSubscription = await this.stripe.createSubscription({
                customerId: stripeCustomerId,
                priceId,
                trialPeriodDays: 14,
                idempotencyKey,
                metadata: { merchantId },
            });
        }
        const subscription = await this.prisma.subscription.create({
            data: {
                merchantId,
                stripeSubscriptionId: stripeSubscription.id,
                stripeCustomerId,
                stripePriceId: priceId,
                status: client_1.SubscriptionStatus.TRIALING,
                currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
                trialStart: stripeSubscription.trial_start
                    ? new Date(stripeSubscription.trial_start * 1000)
                    : null,
                trialEnd: stripeSubscription.trial_end
                    ? new Date(stripeSubscription.trial_end * 1000)
                    : null,
                amount: 2500,
                currency: 'usd',
            },
        });
        await this.prisma.merchant.update({
            where: { id: merchantId },
            data: {
                subscriptionStatus: client_1.SubscriptionStatus.TRIALING,
                subscriptionCurrentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
                trialEndsAt: stripeSubscription.trial_end
                    ? new Date(stripeSubscription.trial_end * 1000)
                    : null,
                onboardingStep: 10,
            },
        });
        this.logger.log(`Subscription created for merchant ${merchantId}`);
        return subscription;
    }
    async createSetupIntent(merchantId) {
        const merchant = await this.prisma.merchant.findUniqueOrThrow({
            where: { id: merchantId },
            include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } },
        });
        let stripeCustomerId = merchant.subscriptions[0]?.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await this.stripe.createStripeCustomer({
                email: merchant.email || '',
                name: merchant.name,
                metadata: { merchantId },
            });
            stripeCustomerId = customer.id;
        }
        const setupIntent = await this.stripe.createSetupIntent({
            customerId: stripeCustomerId,
            idempotencyKey: `setup-${merchantId}-${(0, uuid_1.v4)()}`,
        });
        return {
            clientSecret: setupIntent.client_secret,
            stripeCustomerId,
        };
    }
    async cancelSubscription(merchantId) {
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                merchantId,
                status: { in: [client_1.SubscriptionStatus.ACTIVE, client_1.SubscriptionStatus.TRIALING] },
            },
        });
        if (!subscription?.stripeSubscriptionId) {
            throw new common_1.BadRequestException('No active subscription found');
        }
        await this.stripe.cancelSubscription(subscription.stripeSubscriptionId);
        return this.prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: client_1.SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
        });
    }
    async reactivateSubscription(merchantId) {
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                merchantId,
                status: { in: [client_1.SubscriptionStatus.CANCELLED, client_1.SubscriptionStatus.PAST_DUE] },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!subscription?.stripeSubscriptionId) {
            throw new common_1.NotFoundException('No cancelled subscription found');
        }
        try {
            const reactivated = await this.stripe.resumeSubscription(subscription.stripeSubscriptionId);
            return this.prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                    status: client_1.SubscriptionStatus.ACTIVE,
                    cancelledAt: null,
                    currentPeriodStart: new Date(reactivated.current_period_start * 1000),
                    currentPeriodEnd: new Date(reactivated.current_period_end * 1000),
                },
            });
        }
        catch {
            const merchant = await this.prisma.merchant.findUniqueOrThrow({
                where: { id: merchantId },
            });
            return this.createSubscription(merchantId, {
                email: merchant.email || '',
                merchantName: merchant.name,
            });
        }
    }
    async getBillingPortal(merchantId) {
        const subscription = await this.prisma.subscription.findFirst({
            where: { merchantId },
            orderBy: { createdAt: 'desc' },
        });
        if (!subscription?.stripeCustomerId) {
            throw new common_1.NotFoundException('No billing record found');
        }
        const frontendUrl = this.configService.get('app.frontendUrl');
        const session = await this.stripe.createBillingPortalSession({
            customerId: subscription.stripeCustomerId,
            returnUrl: `${frontendUrl}/dashboard/billing`,
        });
        return { url: session.url };
    }
    async getSubscription(merchantId) {
        return this.prisma.subscription.findFirst({
            where: { merchantId },
            orderBy: { createdAt: 'desc' },
            include: { invoices: { orderBy: { createdAt: 'desc' }, take: 10 } },
        });
    }
    async getInvoices(merchantId) {
        return this.prisma.invoice.findMany({
            where: { merchantId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getPaymentMethods(merchantId) {
        const subscription = await this.prisma.subscription.findFirst({
            where: { merchantId },
            orderBy: { createdAt: 'desc' },
        });
        if (!subscription?.stripeCustomerId)
            return [];
        return this.stripe.listPaymentMethods(subscription.stripeCustomerId);
    }
    async updatePaymentMethod(merchantId, paymentMethodId) {
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                merchantId,
                status: { in: [client_1.SubscriptionStatus.ACTIVE, client_1.SubscriptionStatus.TRIALING, client_1.SubscriptionStatus.PAST_DUE] },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!subscription?.stripeSubscriptionId || !subscription?.stripeCustomerId) {
            throw new common_1.NotFoundException('No active subscription found');
        }
        await this.stripe.attachPaymentMethod(paymentMethodId, subscription.stripeCustomerId);
        await this.stripe.setDefaultPaymentMethod(subscription.stripeCustomerId, paymentMethodId);
        await this.stripe.updateSubscriptionPaymentMethod(subscription.stripeSubscriptionId, paymentMethodId);
        return { success: true };
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = SubscriptionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stripe_service_1.StripeService,
        config_1.ConfigService])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map