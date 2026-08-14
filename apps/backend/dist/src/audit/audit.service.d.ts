import { PrismaService } from '../common/prisma/prisma.service';
import { AuditAction } from '@prisma/client';
interface AuditLogParams {
    merchantId?: string;
    userId?: string;
    employeeId?: string;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    notes?: string;
}
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(params: AuditLogParams): Promise<{
        id: string;
        createdAt: Date;
        merchantId: string | null;
        userId: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        employeeId: string | null;
        notes: string | null;
        action: import("@prisma/client").$Enums.AuditAction;
        resource: string;
        resourceId: string | null;
        before: import("@prisma/client/runtime/library").JsonValue | null;
        after: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    findAll(merchantId: string, params?: {
        action?: AuditAction;
        resource?: string;
        userId?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<({
        user: {
            email: string;
            firstName: string;
            lastName: string;
        } | null;
        employee: {
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        merchantId: string | null;
        userId: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        employeeId: string | null;
        notes: string | null;
        action: import("@prisma/client").$Enums.AuditAction;
        resource: string;
        resourceId: string | null;
        before: import("@prisma/client/runtime/library").JsonValue | null;
        after: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
}
export {};
