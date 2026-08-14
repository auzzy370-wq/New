import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '@prisma/client';
export declare class EmployeesService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    create(merchantId: string, data: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        pin?: string;
        role?: UserRole;
        permissions?: string[];
        locationIds?: string[];
    }, actorUserId?: string): Promise<{
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
    findById(merchantId: string, id: string): Promise<{
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
    update(merchantId: string, id: string, data: Partial<{
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        role: UserRole;
        permissions: string[];
        isActive: boolean;
    }>, actorUserId?: string): Promise<{
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
    validatePin(merchantId: string, employeeId: string, pin: string): Promise<boolean>;
}
