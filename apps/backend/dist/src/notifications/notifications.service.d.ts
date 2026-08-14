import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';
export declare class NotificationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(params: {
        merchantId?: string;
        userId?: string;
        type: NotificationType;
        title: string;
        message: string;
        data?: Record<string, unknown>;
    }): Promise<{
        message: string;
        type: import("@prisma/client").$Enums.NotificationType;
        title: string;
        id: string;
        createdAt: Date;
        merchantId: string | null;
        userId: string | null;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        isRead: boolean;
        readAt: Date | null;
    }>;
    findAll(params: {
        merchantId?: string;
        userId?: string;
        unreadOnly?: boolean;
    }): Promise<{
        message: string;
        type: import("@prisma/client").$Enums.NotificationType;
        title: string;
        id: string;
        createdAt: Date;
        merchantId: string | null;
        userId: string | null;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        isRead: boolean;
        readAt: Date | null;
    }[]>;
    markAsRead(id: string): Promise<{
        message: string;
        type: import("@prisma/client").$Enums.NotificationType;
        title: string;
        id: string;
        createdAt: Date;
        merchantId: string | null;
        userId: string | null;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        isRead: boolean;
        readAt: Date | null;
    }>;
    markAllAsRead(merchantId: string, userId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
