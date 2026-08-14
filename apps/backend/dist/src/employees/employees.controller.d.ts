import { EmployeesService } from './employees.service';
import { AuthenticatedUser } from '../common/types/request.types';
export declare class EmployeesController {
    private readonly employeesService;
    constructor(employeesService: EmployeesService);
    create(merchantId: string, user: AuthenticatedUser, body: Parameters<EmployeesService['create']>[1]): Promise<{
        email: string | null;
        firstName: string;
        lastName: string;
        phone: string | null;
        id: string;
        role: import("@prisma/client").$Enums.UserRole;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        merchantId: string;
        userId: string | null;
        permissions: string[];
        isActive: boolean;
        pin: string | null;
        hiredAt: Date | null;
    }>;
    findAll(merchantId: string): Promise<({
        locations: ({
            location: {
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            locationId: string;
            employeeId: string;
        })[];
    } & {
        email: string | null;
        firstName: string;
        lastName: string;
        phone: string | null;
        id: string;
        role: import("@prisma/client").$Enums.UserRole;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        merchantId: string;
        userId: string | null;
        permissions: string[];
        isActive: boolean;
        pin: string | null;
        hiredAt: Date | null;
    })[]>;
    findOne(merchantId: string, id: string): Promise<{
        locations: ({
            location: {
                name: string;
                email: string | null;
                phone: string | null;
                id: string;
                timezone: string;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                merchantId: string;
                addressLine1: string | null;
                addressLine2: string | null;
                city: string | null;
                state: string | null;
                postalCode: string | null;
                country: string;
                code: string | null;
                isActive: boolean;
                taxRate: import("@prisma/client/runtime/library").Decimal;
                isDefault: boolean;
                stripeLocationId: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            locationId: string;
            employeeId: string;
        })[];
        email: string | null;
        firstName: string;
        lastName: string;
        phone: string | null;
        id: string;
        role: import("@prisma/client").$Enums.UserRole;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        merchantId: string;
        userId: string | null;
        permissions: string[];
        isActive: boolean;
        hiredAt: Date | null;
    }>;
    update(merchantId: string, user: AuthenticatedUser, id: string, body: Parameters<EmployeesService['update']>[2]): Promise<{
        email: string | null;
        firstName: string;
        lastName: string;
        phone: string | null;
        id: string;
        role: import("@prisma/client").$Enums.UserRole;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        merchantId: string;
        userId: string | null;
        permissions: string[];
        isActive: boolean;
        pin: string | null;
        hiredAt: Date | null;
    }>;
    verifyPin(merchantId: string, id: string, pin: string): Promise<{
        valid: boolean;
    }>;
}
