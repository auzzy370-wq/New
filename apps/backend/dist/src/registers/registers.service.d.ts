import { PrismaService } from '../common/prisma/prisma.service';
export declare class RegistersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    openSession(merchantId: string, data: {
        locationId: string;
        employeeId?: string;
        openingCashAmount: number;
        notes?: string;
    }): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.RegisterSessionStatus;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        locationId: string;
        employeeId: string | null;
        notes: string | null;
        openingCashAmount: number;
        expectedCashAmount: number;
        actualCashAmount: number | null;
        cashDifference: number | null;
        cashSales: number;
        cardSales: number;
        refundsTotal: number;
        tipsTotal: number;
        transactionCount: number;
        openedAt: Date;
        closedAt: Date | null;
    }>;
    closeSession(merchantId: string, sessionId: string, data: {
        actualCashAmount: number;
        notes?: string;
    }): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.RegisterSessionStatus;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        locationId: string;
        employeeId: string | null;
        notes: string | null;
        openingCashAmount: number;
        expectedCashAmount: number;
        actualCashAmount: number | null;
        cashDifference: number | null;
        cashSales: number;
        cardSales: number;
        refundsTotal: number;
        tipsTotal: number;
        transactionCount: number;
        openedAt: Date;
        closedAt: Date | null;
    }>;
    getCurrentSession(merchantId: string, locationId: string): Promise<({
        employee: {
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.RegisterSessionStatus;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        locationId: string;
        employeeId: string | null;
        notes: string | null;
        openingCashAmount: number;
        expectedCashAmount: number;
        actualCashAmount: number | null;
        cashDifference: number | null;
        cashSales: number;
        cardSales: number;
        refundsTotal: number;
        tipsTotal: number;
        transactionCount: number;
        openedAt: Date;
        closedAt: Date | null;
    }) | null>;
    getSessions(merchantId: string, locationId?: string): Promise<({
        location: {
            name: string;
        };
        employee: {
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.RegisterSessionStatus;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        locationId: string;
        employeeId: string | null;
        notes: string | null;
        openingCashAmount: number;
        expectedCashAmount: number;
        actualCashAmount: number | null;
        cashDifference: number | null;
        cashSales: number;
        cardSales: number;
        refundsTotal: number;
        tipsTotal: number;
        transactionCount: number;
        openedAt: Date;
        closedAt: Date | null;
    })[]>;
}
