import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
export declare class StripeService {
    private configService;
    private readonly logger;
    private _client;
    constructor(configService: ConfigService);
    get client(): Stripe;
    get isConfigured(): boolean;
    createConnectedAccount(params: {
        email: string;
        businessType?: 'individual' | 'company';
        country?: string;
        merchantId: string;
    }): Promise<Stripe.Account>;
    createAccountOnboardingLink(accountId: string, options: {
        returnUrl: string;
        refreshUrl: string;
    }): Promise<Stripe.AccountLink>;
    retrieveAccount(accountId: string): Promise<Stripe.Account>;
    createLoginLink(accountId: string): Promise<Stripe.LoginLink>;
    createTerminalLocation(params: {
        displayName: string;
        address: {
            line1: string;
            city: string;
            state: string;
            postalCode: string;
            country: string;
        };
        connectedAccountId: string;
    }): Promise<Stripe.Terminal.Location>;
    createTerminalConnectionToken(connectedAccountId: string, locationId?: string): Promise<Stripe.Terminal.ConnectionToken>;
    createPaymentIntent(params: {
        amount: number;
        currency: string;
        connectedAccountId: string;
        applicationFeeAmount: number;
        idempotencyKey: string;
        metadata?: Record<string, string>;
        captureMethod?: 'automatic' | 'manual';
        paymentMethodTypes?: string[];
    }): Promise<Stripe.PaymentIntent>;
    capturePaymentIntent(paymentIntentId: string, connectedAccountId: string): Promise<Stripe.PaymentIntent>;
    retrievePaymentIntent(paymentIntentId: string, connectedAccountId: string): Promise<Stripe.PaymentIntent>;
    cancelPaymentIntent(paymentIntentId: string, connectedAccountId: string): Promise<Stripe.PaymentIntent>;
    createRefund(params: {
        chargeId: string;
        amount: number;
        reason?: Stripe.RefundCreateParams.Reason;
        connectedAccountId: string;
        idempotencyKey: string;
    }): Promise<Stripe.Refund>;
    createStripeCustomer(params: {
        email: string;
        name?: string;
        metadata?: Record<string, string>;
    }): Promise<Stripe.Customer>;
    createSubscription(params: {
        customerId: string;
        priceId: string;
        trialPeriodDays?: number;
        idempotencyKey: string;
        metadata?: Record<string, string>;
    }): Promise<Stripe.Subscription>;
    cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
    retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
    createSetupIntent(params: {
        customerId: string;
        idempotencyKey?: string;
    }): Promise<Stripe.SetupIntent>;
    attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<Stripe.PaymentMethod>;
    setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<Stripe.Customer>;
    updateSubscriptionPaymentMethod(subscriptionId: string, paymentMethodId: string): Promise<Stripe.Subscription>;
    listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]>;
    createBillingPortalSession(params: {
        customerId: string;
        returnUrl: string;
    }): Promise<Stripe.BillingPortal.Session>;
    resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
    updateSubscription(subscriptionId: string, params: Stripe.SubscriptionUpdateParams): Promise<Stripe.Subscription>;
    createSubscriptionWithPaymentMethod(params: {
        customerId: string;
        priceId: string;
        paymentMethodId: string;
        trialPeriodDays?: number;
        idempotencyKey: string;
        metadata?: Record<string, string>;
    }): Promise<Stripe.Subscription>;
    constructWebhookEvent(payload: string | Buffer, signature: string, secret: string): Stripe.Event;
}
