import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    findAll(merchantId: string, resource?: string, limit?: number): Promise<({
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
