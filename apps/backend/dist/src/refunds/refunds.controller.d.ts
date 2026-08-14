import { RefundsService } from './refunds.service';
export declare class RefundsController {
    private readonly refundsService;
    constructor(refundsService: RefundsService);
    create(merchantId: string, body: Parameters<RefundsService['createRefund']>[1], idempotencyKey: string): Promise<any>;
    findAll(merchantId: string, orderId?: string): Promise<({
        items: {
            id: string;
            createdAt: Date;
            amount: number;
            quantity: number;
            orderItemId: string;
            refundId: string;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.RefundStatus;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        currency: string;
        idempotencyKey: string | null;
        amount: number;
        reason: string | null;
        orderId: string;
        notes: string | null;
        failureReason: string | null;
        paymentId: string;
        stripeRefundId: string | null;
        restoreInventory: boolean;
        processedAt: Date | null;
    })[]>;
}
