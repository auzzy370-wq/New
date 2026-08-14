import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private readonly configService;
    private readonly logger;
    private transporter;
    constructor(configService: ConfigService);
    sendVerificationEmail(email: string, firstName: string, token: string): Promise<void>;
    sendPasswordResetEmail(email: string, firstName: string, token: string): Promise<void>;
    sendReceiptEmail(params: {
        to: string;
        merchantName: string;
        orderNumber: string;
        total: string;
        items: Array<{
            name: string;
            quantity: number;
            price: string;
        }>;
        receiptUrl?: string;
    }): Promise<void>;
    sendSubscriptionFailedEmail(email: string, firstName: string): Promise<void>;
    private send;
    private buildEmailTemplate;
}
