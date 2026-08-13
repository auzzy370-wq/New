import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from '../common/stripe/stripe.service';
import { PaymentsService } from '../payments/payments.service';
import { WebhookEventStatus, SubscriptionStatus, DisputeStatus } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.constructWebhookEvent(
        payload,
        signature,
        this.configService.get<string>('stripe.webhookSecret')!,
      );
    } catch (err) {
      this.logger.error('Webhook signature verification failed:', err);
      throw new BadRequestException('Invalid webhook signature');
    }

    // Idempotency: skip duplicate events
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { externalId: event.id },
    });

    if (existing) {
      this.logger.log(`Duplicate webhook event skipped: ${event.id}`);
      return;
    }

    // Record the event
    const webhookRecord = await this.prisma.webhookEvent.create({
      data: {
        externalId: event.id,
        source: 'stripe',
        type: event.type,
        status: WebhookEventStatus.PENDING,
        payload: event as object,
      },
    });

    try {
      await this.processEvent(event);

      await this.prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { status: WebhookEventStatus.PROCESSED, processedAt: new Date() },
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Webhook processing failed for ${event.type}: ${err.message}`);

      await this.prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: {
          status: WebhookEventStatus.FAILED,
          processingError: err.message,
          retryCount: { increment: 1 },
        },
      });

      throw error;
    }
  }

  private async processEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.canceled':
        await this.handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.dispute.created':
        await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      case 'charge.dispute.closed':
        await this.handleDisputeClosed(event.data.object as Stripe.Dispute);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'account.updated':
        await this.handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      default:
        this.logger.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!payment) {
      this.logger.warn(`No payment found for PaymentIntent: ${paymentIntent.id}`);
      return;
    }

    if (payment.status === 'SUCCEEDED') return; // Already handled

    await this.paymentsService.handlePaymentSuccess(payment.id, paymentIntent as unknown as Parameters<PaymentsService['handlePaymentSuccess']>[1]);
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!payment) return;

    const failureReason =
      paymentIntent.last_payment_error?.message || 'Payment failed';

    await this.paymentsService.handlePaymentFailure(payment.id, failureReason);
  }

  private async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!payment) return;

    await this.paymentsService.handlePaymentFailure(payment.id, 'Payment was cancelled');
  }

  private async handleDisputeCreated(dispute: Stripe.Dispute) {
    const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
    if (!chargeId) return;

    const payment = await this.prisma.payment.findFirst({
      where: { stripeChargeId: chargeId },
    });

    if (!payment) return;

    await this.prisma.dispute.upsert({
      where: { paymentId: payment.id },
      create: {
        merchantId: payment.merchantId,
        paymentId: payment.id,
        stripeDisputeId: dispute.id,
        status: DisputeStatus.NEEDS_RESPONSE,
        reason: dispute.reason,
        amount: dispute.amount,
        currency: dispute.currency,
        evidenceDueBy: dispute.evidence_details?.due_by
          ? new Date(dispute.evidence_details.due_by * 1000)
          : null,
      },
      update: {
        status: DisputeStatus.NEEDS_RESPONSE,
      },
    });

    this.logger.warn(`Dispute created for payment: ${payment.id}`);
  }

  private async handleDisputeClosed(dispute: Stripe.Dispute) {
    await this.prisma.dispute.updateMany({
      where: { stripeDisputeId: dispute.id },
      data: {
        status: dispute.status === 'won' ? DisputeStatus.WON : DisputeStatus.LOST,
      },
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const merchantId = subscription.metadata?.merchantId;
    if (!merchantId) return;

    const statusMap: Record<string, SubscriptionStatus> = {
      trialing: SubscriptionStatus.TRIALING,
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELLED,
      unpaid: SubscriptionStatus.UNPAID,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
      paused: SubscriptionStatus.PAUSED,
    };

    await this.prisma.subscription.upsert({
      where: { stripeSubscriptionId: subscription.id },
      create: {
        merchantId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
        stripePriceId: subscription.items.data[0]?.price.id,
        status: statusMap[subscription.status] || SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        amount: subscription.items.data[0]?.price.unit_amount || 2500,
        currency: subscription.currency || 'usd',
      },
      update: {
        status: statusMap[subscription.status] || SubscriptionStatus.ACTIVE,
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
        subscriptionStatus: statusMap[subscription.status] || SubscriptionStatus.ACTIVE,
        subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    if (!subscriptionId) return;

    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!sub) return;

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

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    if (!subscriptionId) return;

    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!sub) return;

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

    // Grace period: mark subscription as past_due
    await this.prisma.merchant.update({
      where: { id: sub.merchantId },
      data: { subscriptionStatus: SubscriptionStatus.PAST_DUE },
    });
  }

  private async handleAccountUpdated(account: Stripe.Account) {
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
}
