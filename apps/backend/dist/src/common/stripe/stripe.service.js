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
var StripeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = require("stripe");
let StripeService = StripeService_1 = class StripeService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(StripeService_1.name);
        this._client = null;
        const key = this.configService.get('stripe.secretKey');
        if (key) {
            this._client = new stripe_1.default(key, {
                apiVersion: '2024-04-10',
                typescript: true,
            });
            this.logger.log('Stripe client initialized');
        }
        else {
            this.logger.warn('STRIPE_SECRET_KEY not set — Stripe features disabled');
        }
    }
    get client() {
        if (!this._client) {
            throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.');
        }
        return this._client;
    }
    get isConfigured() {
        return this._client !== null;
    }
    async createConnectedAccount(params) {
        return this.client.accounts.create({
            type: 'express',
            email: params.email,
            business_type: params.businessType || 'individual',
            country: params.country || 'US',
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            metadata: { merchantId: params.merchantId },
        });
    }
    async createAccountOnboardingLink(accountId, options) {
        return this.client.accountLinks.create({
            account: accountId,
            refresh_url: options.refreshUrl,
            return_url: options.returnUrl,
            type: 'account_onboarding',
        });
    }
    async retrieveAccount(accountId) {
        return this.client.accounts.retrieve(accountId);
    }
    async createLoginLink(accountId) {
        return this.client.accounts.createLoginLink(accountId);
    }
    async createTerminalLocation(params) {
        return this.client.terminal.locations.create({
            display_name: params.displayName,
            address: {
                line1: params.address.line1,
                city: params.address.city,
                state: params.address.state,
                postal_code: params.address.postalCode,
                country: params.address.country,
            },
        }, { stripeAccount: params.connectedAccountId });
    }
    async createTerminalConnectionToken(connectedAccountId, locationId) {
        return this.client.terminal.connectionTokens.create({ location: locationId }, { stripeAccount: connectedAccountId });
    }
    async createPaymentIntent(params) {
        return this.client.paymentIntents.create({
            amount: params.amount,
            currency: params.currency,
            application_fee_amount: params.applicationFeeAmount,
            capture_method: params.captureMethod || 'automatic',
            payment_method_types: params.paymentMethodTypes || ['card_present'],
            metadata: params.metadata || {},
        }, {
            stripeAccount: params.connectedAccountId,
            idempotencyKey: params.idempotencyKey,
        });
    }
    async capturePaymentIntent(paymentIntentId, connectedAccountId) {
        return this.client.paymentIntents.capture(paymentIntentId, {}, {
            stripeAccount: connectedAccountId,
        });
    }
    async retrievePaymentIntent(paymentIntentId, connectedAccountId) {
        return this.client.paymentIntents.retrieve(paymentIntentId, {}, {
            stripeAccount: connectedAccountId,
        });
    }
    async cancelPaymentIntent(paymentIntentId, connectedAccountId) {
        return this.client.paymentIntents.cancel(paymentIntentId, {}, {
            stripeAccount: connectedAccountId,
        });
    }
    async createRefund(params) {
        return this.client.refunds.create({
            charge: params.chargeId,
            amount: params.amount,
            reason: params.reason,
        }, {
            stripeAccount: params.connectedAccountId,
            idempotencyKey: params.idempotencyKey,
        });
    }
    async createStripeCustomer(params) {
        return this.client.customers.create({
            email: params.email,
            name: params.name,
            metadata: params.metadata || {},
        });
    }
    async createSubscription(params) {
        return this.client.subscriptions.create({
            customer: params.customerId,
            items: [{ price: params.priceId }],
            trial_period_days: params.trialPeriodDays,
            metadata: params.metadata || {},
            expand: ['latest_invoice.payment_intent'],
        }, { idempotencyKey: params.idempotencyKey });
    }
    async cancelSubscription(subscriptionId) {
        return this.client.subscriptions.cancel(subscriptionId);
    }
    async retrieveSubscription(subscriptionId) {
        return this.client.subscriptions.retrieve(subscriptionId);
    }
    async createSetupIntent(params) {
        return this.client.setupIntents.create({
            customer: params.customerId,
            payment_method_types: ['card'],
            usage: 'off_session',
        }, params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : {});
    }
    async attachPaymentMethod(paymentMethodId, customerId) {
        return this.client.paymentMethods.attach(paymentMethodId, { customer: customerId });
    }
    async setDefaultPaymentMethod(customerId, paymentMethodId) {
        return this.client.customers.update(customerId, {
            invoice_settings: { default_payment_method: paymentMethodId },
        });
    }
    async updateSubscriptionPaymentMethod(subscriptionId, paymentMethodId) {
        return this.client.subscriptions.update(subscriptionId, {
            default_payment_method: paymentMethodId,
        });
    }
    async listPaymentMethods(customerId) {
        const result = await this.client.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });
        return result.data;
    }
    async createBillingPortalSession(params) {
        return this.client.billingPortal.sessions.create({
            customer: params.customerId,
            return_url: params.returnUrl,
        });
    }
    async resumeSubscription(subscriptionId) {
        return this.client.subscriptions.resume(subscriptionId, {
            billing_cycle_anchor: 'now',
        });
    }
    async updateSubscription(subscriptionId, params) {
        return this.client.subscriptions.update(subscriptionId, params);
    }
    async createSubscriptionWithPaymentMethod(params) {
        return this.client.subscriptions.create({
            customer: params.customerId,
            items: [{ price: params.priceId }],
            default_payment_method: params.paymentMethodId,
            trial_period_days: params.trialPeriodDays,
            metadata: params.metadata || {},
            expand: ['latest_invoice.payment_intent'],
        }, { idempotencyKey: params.idempotencyKey });
    }
    constructWebhookEvent(payload, signature, secret) {
        return this.client.webhooks.constructEvent(payload, signature, secret);
    }
};
exports.StripeService = StripeService;
exports.StripeService = StripeService = StripeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StripeService);
//# sourceMappingURL=stripe.service.js.map