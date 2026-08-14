import { SubscriptionsService } from './subscriptions.service';
import { AuthenticatedUser } from '../common/types/request.types';
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    getSubscription(merchantId: string): Promise<({
        invoices: {
            number: string | null;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            merchantId: string;
            currency: string;
            amount: number;
            paidAt: Date | null;
            subscriptionId: string | null;
            stripeInvoiceId: string | null;
            periodStart: Date | null;
            periodEnd: Date | null;
            dueDate: Date | null;
            hostedInvoiceUrl: string | null;
            invoicePdf: string | null;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        currency: string;
        amount: number;
        stripeSubscriptionId: string | null;
        stripeCustomerId: string | null;
        stripePriceId: string | null;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        trialStart: Date | null;
        trialEnd: Date | null;
        cancelAt: Date | null;
        cancelledAt: Date | null;
        gracePeriodEnd: Date | null;
    }) | null>;
    create(merchantId: string, user: AuthenticatedUser, body: {
        merchantName: string;
        paymentMethodId?: string;
    }): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        currency: string;
        amount: number;
        stripeSubscriptionId: string | null;
        stripeCustomerId: string | null;
        stripePriceId: string | null;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        trialStart: Date | null;
        trialEnd: Date | null;
        cancelAt: Date | null;
        cancelledAt: Date | null;
        gracePeriodEnd: Date | null;
    }>;
    createSetupIntent(merchantId: string): Promise<{
        clientSecret: string | null;
        stripeCustomerId: string;
    }>;
    cancel(merchantId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        currency: string;
        amount: number;
        stripeSubscriptionId: string | null;
        stripeCustomerId: string | null;
        stripePriceId: string | null;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        trialStart: Date | null;
        trialEnd: Date | null;
        cancelAt: Date | null;
        cancelledAt: Date | null;
        gracePeriodEnd: Date | null;
    }>;
    reactivate(merchantId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        currency: string;
        amount: number;
        stripeSubscriptionId: string | null;
        stripeCustomerId: string | null;
        stripePriceId: string | null;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        trialStart: Date | null;
        trialEnd: Date | null;
        cancelAt: Date | null;
        cancelledAt: Date | null;
        gracePeriodEnd: Date | null;
    }>;
    getBillingPortal(merchantId: string): Promise<{
        url: string;
    }>;
    getInvoices(merchantId: string): Promise<{
        number: string | null;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        currency: string;
        amount: number;
        paidAt: Date | null;
        subscriptionId: string | null;
        stripeInvoiceId: string | null;
        periodStart: Date | null;
        periodEnd: Date | null;
        dueDate: Date | null;
        hostedInvoiceUrl: string | null;
        invoicePdf: string | null;
    }[]>;
    getPaymentMethods(merchantId: string): Promise<import("stripe").Stripe.PaymentMethod[]>;
    updatePaymentMethod(merchantId: string, body: {
        paymentMethodId: string;
    }): Promise<{
        success: boolean;
    }>;
}
