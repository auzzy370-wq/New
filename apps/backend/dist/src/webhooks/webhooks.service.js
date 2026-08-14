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
var WebhooksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../common/prisma/prisma.service");
const stripe_service_1 = require("../common/stripe/stripe.service");
const payments_service_1 = require("../payments/payments.service");
const client_1 = require("@prisma/client");
let WebhooksService = WebhooksService_1 = class WebhooksService {
    constructor(prisma, stripe, configService, paymentsService) {
        this.prisma = prisma;
        this.stripe = stripe;
        this.configService = configService;
        this.paymentsService = paymentsService;
        this.logger = new common_1.Logger(WebhooksService_1.name);
    }
    async handleStripeWebhook(payload, signature) {
        let event;
        try {
            event = this.stripe.constructWebhookEvent(payload, signature, this.configService.get('stripe.webhookSecret'));
        }
        catch (err) {
            this.logger.error('Webhook signature verification failed:', err);
            throw new common_1.BadRequestException('Invalid webhook signature');
        }
        const existing = await this.prisma.webhookEvent.findUnique({
            where: { externalId: event.id },
        });
        if (existing) {
            this.logger.log(`Duplicate webhook event skipped: ${event.id}`);
            return;
        }
        const webhookRecord = await this.prisma.webhookEvent.create({
            data: {
                externalId: event.id,
                source: 'stripe',
                type: event.type,
                status: client_1.WebhookEventStatus.PENDING,
                payload: event,
            },
        });
        try {
            await this.processEvent(event);
            await this.prisma.webhookEvent.update({
                where: { id: webhookRecord.id },
                data: { status: client_1.WebhookEventStatus.PROCESSED, processedAt: new Date() },
            });
        }
        catch (error) {
            const err = error;
            this.logger.error(`Webhook processing failed for ${event.type}: ${err.message}`);
            await this.prisma.webhookEvent.update({
                where: { id: webhookRecord.id },
                data: {
                    status: client_1.WebhookEventStatus.FAILED,
                    processingError: err.message,
                    retryCount: { increment: 1 },
                },
            });
            throw error;
        }
    }
    async processEvent(event) {
        this.logger.log(`Processing webhook: ${event.type}`);
        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.handlePaymentIntentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await this.handlePaymentIntentFailed(event.data.object);
                break;
            case 'payment_intent.canceled':
                await this.handlePaymentIntentCanceled(event.data.object);
                break;
            case 'charge.dispute.created':
                await this.handleDisputeCreated(event.data.object);
                break;
            case 'charge.dispute.closed':
                await this.handleDisputeClosed(event.data.object);
                break;
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await this.handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await this.handleSubscriptionDeleted(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                await this.handleInvoicePaymentSucceeded(event.data.object);
                break;
            case 'invoice.payment_failed':
                await this.handleInvoicePaymentFailed(event.data.object);
                break;
            case 'account.updated':
                await this.handleAccountUpdated(event.data.object);
                break;
            default:
                this.logger.log(`Unhandled webhook event type: ${event.type}`);
        }
    }
    async handlePaymentIntentSucceeded(paymentIntent) {
        const payment = await this.prisma.payment.findFirst({
            where: { stripePaymentIntentId: paymentIntent.id },
        });
        if (!payment) {
            this.logger.warn(`No payment found for PaymentIntent: ${paymentIntent.id}`);
            return;
        }
        if (payment.status === 'SUCCEEDED')
            return;
        await this.paymentsService.handlePaymentSuccess(payment.id, paymentIntent);
    }
    async handlePaymentIntentFailed(paymentIntent) {
        const payment = await this.prisma.payment.findFirst({
            where: { stripePaymentIntentId: paymentIntent.id },
        });
        if (!payment)
            return;
        const failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
        await this.paymentsService.handlePaymentFailure(payment.id, failureReason);
    }
    async handlePaymentIntentCanceled(paymentIntent) {
        const payment = await this.prisma.payment.findFirst({
            where: { stripePaymentIntentId: paymentIntent.id },
        });
        if (!payment)
            return;
        await this.paymentsService.handlePaymentFailure(payment.id, 'Payment was cancelled');
    }
    async handleDisputeCreated(dispute) {
        const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
        if (!chargeId)
            return;
        const payment = await this.prisma.payment.findFirst({
            where: { stripeChargeId: chargeId },
        });
        if (!payment)
            return;
        await this.prisma.dispute.upsert({
            where: { paymentId: payment.id },
            create: {
                merchantId: payment.merchantId,
                paymentId: payment.id,
                stripeDisputeId: dispute.id,
                status: client_1.DisputeStatus.NEEDS_RESPONSE,
                reason: dispute.reason,
                amount: dispute.amount,
                currency: dispute.currency,
                evidenceDueBy: dispute.evidence_details?.due_by
                    ? new Date(dispute.evidence_details.due_by * 1000)
                    : null,
            },
            update: {
                status: client_1.DisputeStatus.NEEDS_RESPONSE,
            },
        });
        this.logger.warn(`Dispute created for payment: ${payment.id}`);
    }
    async handleDisputeClosed(dispute) {
        await this.prisma.dispute.updateMany({
            where: { stripeDisputeId: dispute.id },
            data: {
                status: dispute.status === 'won' ? client_1.DisputeStatus.WON : client_1.DisputeStatus.LOST,
            },
        });
    }
    async handleSubscriptionUpdated(subscription) {
        const merchantId = subscription.metadata?.merchantId;
        if (!merchantId)
            return;
        const statusMap = {
            trialing: client_1.SubscriptionStatus.TRIALING,
            active: client_1.SubscriptionStatus.ACTIVE,
            past_due: client_1.SubscriptionStatus.PAST_DUE,
            canceled: client_1.SubscriptionStatus.CANCELLED,
            unpaid: client_1.SubscriptionStatus.UNPAID,
            incomplete: client_1.SubscriptionStatus.INCOMPLETE,
            incomplete_expired: client_1.SubscriptionStatus.INCOMPLETE_EXPIRED,
            paused: client_1.SubscriptionStatus.PAUSED,
        };
        await this.prisma.subscription.upsert({
            where: { stripeSubscriptionId: subscription.id },
            create: {
                merchantId,
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
                stripePriceId: subscription.items.data[0]?.price.id,
                status: statusMap[subscription.status] || client_1.SubscriptionStatus.ACTIVE,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                amount: subscription.items.data[0]?.price.unit_amount || 2500,
                currency: subscription.currency || 'usd',
            },
            update: {
                status: statusMap[subscription.status] || client_1.SubscriptionStatus.ACTIVE,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelledAt: subscription.canceled_at
                    ? new Date(subscription.canceled_at * 1000)
                    : null,
            },
        });
        await this.prisma.merchant.update({
            where: { id: merchantId },
            data: {
                subscriptionStatus: statusMap[subscription.status] || client_1.SubscriptionStatus.ACTIVE,
                subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
        });
    }
    async handleSubscriptionDeleted(subscription) {
        await this.prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: {
                status: client_1.SubscriptionStatus.CANCELLED,
                cancelledAt: new Date(),
            },
        });
    }
    async handleInvoicePaymentSucceeded(invoice) {
        const subscriptionId = typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id;
        if (!subscriptionId)
            return;
        const sub = await this.prisma.subscription.findFirst({
            where: { stripeSubscriptionId: subscriptionId },
        });
        if (!sub)
            return;
        await this.prisma.invoice.upsert({
            where: { stripeInvoiceId: invoice.id },
            create: {
                merchantId: sub.merchantId,
                subscriptionId: sub.id,
                stripeInvoiceId: invoice.id,
                number: invoice.number,
                status: 'paid',
                amount: invoice.amount_paid,
                currency: invoice.currency,
                periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
                periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
                paidAt: new Date(),
                hostedInvoiceUrl: invoice.hosted_invoice_url,
                invoicePdf: invoice.invoice_pdf,
            },
            update: { status: 'paid', paidAt: new Date() },
        });
    }
    async handleInvoicePaymentFailed(invoice) {
        const subscriptionId = typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id;
        if (!subscriptionId)
            return;
        const sub = await this.prisma.subscription.findFirst({
            where: { stripeSubscriptionId: subscriptionId },
        });
        if (!sub)
            return;
        await this.prisma.invoice.upsert({
            where: { stripeInvoiceId: invoice.id },
            create: {
                merchantId: sub.merchantId,
                subscriptionId: sub.id,
                stripeInvoiceId: invoice.id,
                number: invoice.number,
                status: 'payment_failed',
                amount: invoice.amount_due,
                currency: invoice.currency,
            },
            update: { status: 'payment_failed' },
        });
        await this.prisma.merchant.update({
            where: { id: sub.merchantId },
            data: { subscriptionStatus: client_1.SubscriptionStatus.PAST_DUE },
        });
    }
    async handleAccountUpdated(account) {
        await this.prisma.merchant.updateMany({
            where: { stripeAccountId: account.id },
            data: {
                stripeAccountStatus: account.charges_enabled ? 'active' : 'pending',
                stripeChargesEnabled: account.charges_enabled,
                stripePayoutsEnabled: account.payouts_enabled,
                stripeOnboardingComplete: account.details_submitted && account.charges_enabled,
            },
        });
    }
};
exports.WebhooksService = WebhooksService;
exports.WebhooksService = WebhooksService = WebhooksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stripe_service_1.StripeService,
        config_1.ConfigService,
        payments_service_1.PaymentsService])
], WebhooksService);
//# sourceMappingURL=webhooks.service.js.map