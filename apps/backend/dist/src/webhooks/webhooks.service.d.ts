import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from '../common/stripe/stripe.service';
import { PaymentsService } from '../payments/payments.service';
export declare class WebhooksService {
    private readonly prisma;
    private readonly stripe;
    private readonly configService;
    private readonly paymentsService;
    private readonly logger;
    constructor(prisma: PrismaService, stripe: StripeService, configService: ConfigService, paymentsService: PaymentsService);
    handleStripeWebhook(payload: Buffer, signature: string): Promise<void>;
    private processEvent;
    private handlePaymentIntentSucceeded;
    private handlePaymentIntentFailed;
    private handlePaymentIntentCanceled;
    private handleDisputeCreated;
    private handleDisputeClosed;
    private handleSubscriptionUpdated;
    private handleSubscriptionDeleted;
    private handleInvoicePaymentSucceeded;
    private handleInvoicePaymentFailed;
    private handleAccountUpdated;
}
