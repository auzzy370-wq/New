import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  readonly client: Stripe;

  constructor(private configService: ConfigService) {
    this.client = new Stripe(this.configService.get<string>('stripe.secretKey')!, {
      apiVersion: '2024-04-10',
      typescript: true,
    });
  }

  // ── Connect ─────────────────────────────────────────────────────────────────

  async createConnectedAccount(params: {
    email: string;
    businessType?: 'individual' | 'company';
    country?: string;
    merchantId: string;
  }): Promise<Stripe.Account> {
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

  async createAccountOnboardingLink(accountId: string, options: {
    returnUrl: string;
    refreshUrl: string;
  }): Promise<Stripe.AccountLink> {
    return this.client.accountLinks.create({
      account: accountId,
      refresh_url: options.refreshUrl,
      return_url: options.returnUrl,
      type: 'account_onboarding',
    });
  }

  async retrieveAccount(accountId: string): Promise<Stripe.Account> {
    return this.client.accounts.retrieve(accountId);
  }

  async createLoginLink(accountId: string): Promise<Stripe.LoginLink> {
    return this.client.accounts.createLoginLink(accountId);
  }

  // ── Terminal ─────────────────────────────────────────────────────────────────

  async createTerminalLocation(params: {
    displayName: string;
    address: {
      line1: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    connectedAccountId: string;
  }): Promise<Stripe.Terminal.Location> {
    return this.client.terminal.locations.create(
      {
        display_name: params.displayName,
        address: {
          line1: params.address.line1,
          city: params.address.city,
          state: params.address.state,
          postal_code: params.address.postalCode,
          country: params.address.country,
        },
      },
      { stripeAccount: params.connectedAccountId },
    );
  }

  async createTerminalConnectionToken(connectedAccountId: string, locationId?: string): Promise<Stripe.Terminal.ConnectionToken> {
    return this.client.terminal.connectionTokens.create(
      { location: locationId },
      { stripeAccount: connectedAccountId },
    );
  }

  // ── Payment Intents ───────────────────────────────────────────────────────────

  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    connectedAccountId: string;
    applicationFeeAmount: number;
    idempotencyKey: string;
    metadata?: Record<string, string>;
    captureMethod?: 'automatic' | 'manual';
    paymentMethodTypes?: string[];
  }): Promise<Stripe.PaymentIntent> {
    return this.client.paymentIntents.create(
      {
        amount: params.amount,
        currency: params.currency,
        application_fee_amount: params.applicationFeeAmount,
        capture_method: params.captureMethod || 'automatic',
        payment_method_types: params.paymentMethodTypes || ['card_present'],
        metadata: params.metadata || {},
      },
      {
        stripeAccount: params.connectedAccountId,
        idempotencyKey: params.idempotencyKey,
      },
    );
  }

  async capturePaymentIntent(
    paymentIntentId: string,
    connectedAccountId: string,
  ): Promise<Stripe.PaymentIntent> {
    return this.client.paymentIntents.capture(paymentIntentId, {}, {
      stripeAccount: connectedAccountId,
    });
  }

  async retrievePaymentIntent(
    paymentIntentId: string,
    connectedAccountId: string,
  ): Promise<Stripe.PaymentIntent> {
    return this.client.paymentIntents.retrieve(paymentIntentId, {}, {
      stripeAccount: connectedAccountId,
    });
  }

  async cancelPaymentIntent(
    paymentIntentId: string,
    connectedAccountId: string,
  ): Promise<Stripe.PaymentIntent> {
    return this.client.paymentIntents.cancel(paymentIntentId, {}, {
      stripeAccount: connectedAccountId,
    });
  }

  // ── Refunds ───────────────────────────────────────────────────────────────────

  async createRefund(params: {
    chargeId: string;
    amount: number;
    reason?: Stripe.RefundCreateParams.Reason;
    connectedAccountId: string;
    idempotencyKey: string;
  }): Promise<Stripe.Refund> {
    return this.client.refunds.create(
      {
        charge: params.chargeId,
        amount: params.amount,
        reason: params.reason,
      },
      {
        stripeAccount: params.connectedAccountId,
        idempotencyKey: params.idempotencyKey,
      },
    );
  }

  // ── Customers ─────────────────────────────────────────────────────────────────

  async createStripeCustomer(params: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    return this.client.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata || {},
    });
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────────

  async createSubscription(params: {
    customerId: string;
    priceId: string;
    trialPeriodDays?: number;
    idempotencyKey: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    return this.client.subscriptions.create(
      {
        customer: params.customerId,
        items: [{ price: params.priceId }],
        trial_period_days: params.trialPeriodDays,
        metadata: params.metadata || {},
        expand: ['latest_invoice.payment_intent'],
      },
      { idempotencyKey: params.idempotencyKey },
    );
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.client.subscriptions.cancel(subscriptionId);
  }

  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.client.subscriptions.retrieve(subscriptionId);
  }

  // ── Setup Intents ──────────────────────────────────────────────────────────────

  async createSetupIntent(params: {
    customerId: string;
    idempotencyKey?: string;
  }): Promise<Stripe.SetupIntent> {
    return this.client.setupIntents.create(
      {
        customer: params.customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      },
      params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : {},
    );
  }

  async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<Stripe.PaymentMethod> {
    return this.client.paymentMethods.attach(paymentMethodId, { customer: customerId });
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<Stripe.Customer> {
    return this.client.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    }) as Promise<Stripe.Customer>;
  }

  async updateSubscriptionPaymentMethod(
    subscriptionId: string,
    paymentMethodId: string,
  ): Promise<Stripe.Subscription> {
    return this.client.subscriptions.update(subscriptionId, {
      default_payment_method: paymentMethodId,
    });
  }

  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const result = await this.client.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return result.data;
  }

  // ── Billing Portal ──────────────────────────────────────────────────────────

  async createBillingPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<Stripe.BillingPortal.Session> {
    return this.client.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });
  }

  // ── Subscription Management ──────────────────────────────────────────────────

  async resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.client.subscriptions.resume(subscriptionId, {
      billing_cycle_anchor: 'now',
    });
  }

  async updateSubscription(subscriptionId: string, params: Stripe.SubscriptionUpdateParams): Promise<Stripe.Subscription> {
    return this.client.subscriptions.update(subscriptionId, params);
  }

  async createSubscriptionWithPaymentMethod(params: {
    customerId: string;
    priceId: string;
    paymentMethodId: string;
    trialPeriodDays?: number;
    idempotencyKey: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    return this.client.subscriptions.create(
      {
        customer: params.customerId,
        items: [{ price: params.priceId }],
        default_payment_method: params.paymentMethodId,
        trial_period_days: params.trialPeriodDays,
        metadata: params.metadata || {},
        expand: ['latest_invoice.payment_intent'],
      },
      { idempotencyKey: params.idempotencyKey },
    );
  }

  // ── Webhooks ──────────────────────────────────────────────────────────────────

  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): Stripe.Event {
    return this.client.webhooks.constructEvent(payload, signature, secret);
  }
}
