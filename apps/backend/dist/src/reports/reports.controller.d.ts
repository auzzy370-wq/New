import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getDashboard(merchantId: string): Promise<{
        today: {
            revenue: number;
            tips: number;
            orders: number;
            averageOrderValue: number;
        };
        thisMonth: {
            revenue: number;
            orders: number;
        };
        lastMonth: {
            revenue: number;
            orders: number;
        };
        topProducts: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.OrderItemGroupByOutputType, ("name" | "productId")[]> & {
            _sum: {
                quantity: number | null;
                totalAmount: number | null;
            };
        })[];
        lowStock: ({
            location: {
                name: string;
            };
            product: {
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            merchantId: string;
            lowStockThreshold: number;
            locationId: string;
            productId: string;
            variantId: string | null;
            quantity: number;
        })[];
    }>;
    getSales(merchantId: string, startDate: string, endDate: string, locationId?: string): Promise<{
        summary: {
            totalRevenue: number;
            totalSubtotal: number;
            totalTips: number;
            totalDiscounts: number;
            totalTax: number;
            orderCount: number;
            averageOrderValue: number;
        };
        byLocation: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.OrderGroupByOutputType, "locationId"[]> & {
            _count: number;
            _sum: {
                totalAmount: number | null;
            };
        })[];
        byEmployee: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.OrderGroupByOutputType, "employeeId"[]> & {
            _count: number;
            _sum: {
                totalAmount: number | null;
            };
        })[];
        byPaymentMethod: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.PaymentGroupByOutputType, "method"[]> & {
            _count: number;
            _sum: {
                amount: number | null;
            };
        })[];
        topProducts: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.OrderItemGroupByOutputType, ("name" | "productId")[]> & {
            _sum: {
                quantity: number | null;
                totalAmount: number | null;
            };
        })[];
        byHour: unknown;
    }>;
    getRevenue(merchantId: string, startDate: string, endDate: string): Promise<{
        platformFeeRevenue: number;
        transactionVolume: number;
        transactionCount: number;
        subscriptionRevenue: number;
        refundsTotal: number;
        refundCount: number;
        totalRevenue: number;
    }>;
}
