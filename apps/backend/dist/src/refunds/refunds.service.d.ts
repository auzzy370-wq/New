import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from '../common/stripe/stripe.service';
import { RedisService } from '../common/redis/redis.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
export declare class RefundsService {
    private readonly prisma;
    private readonly stripe;
    private readonly redis;
    private readonly inventoryService;
    private readonly auditService;
    private readonly logger;
    constructor(prisma: PrismaService, stripe: StripeService, redis: RedisService, inventoryService: InventoryService, auditService: AuditService);
    createRefund(merchantId: string, params: {
        orderId: string;
        amount: number;
        reason?: string;
        notes?: string;
        restoreInventory?: boolean;
        items?: Array<{
            orderItemId: string;
            quantity: number;
            amount: number;
        }>;
        idempotencyKey?: string;
    }): Promise<any>;
    getRefunds(merchantId: string, orderId?: string): Promise<({
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
    private mapRefundReason;
}
