import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from '../common/stripe/stripe.service';
import { ConfigService } from '@nestjs/config';
export declare class SubscriptionsService {
    private readonly prisma;
    private readonly stripe;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, stripe: StripeService, configService: ConfigService);
    createSubscription(merchantId: string, params: {
        email: string;
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
    cancelSubscription(merchantId: string): Promise<{
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
    reactivateSubscription(merchantId: string): Promise<{
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
    updatePaymentMethod(merchantId: string, paymentMethodId: string): Promise<{
        success: boolean;
    }>;
}
