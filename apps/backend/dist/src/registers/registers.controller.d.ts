import { RegistersService } from './registers.service';
export declare class RegistersController {
    private readonly registersService;
    constructor(registersService: RegistersService);
    open(merchantId: string, body: Parameters<RegistersService['openSession']>[1]): Promise<{
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
    close(merchantId: string, id: string, body: Parameters<RegistersService['closeSession']>[2]): Promise<{
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
    getCurrent(merchantId: string, locationId: string): Promise<({
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
