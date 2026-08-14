import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from '../common/stripe/stripe.service';
import { DeviceType } from '@prisma/client';
export declare class DevicesService {
    private readonly prisma;
    private readonly stripe;
    constructor(prisma: PrismaService, stripe: StripeService);
    register(merchantId: string, data: {
        name: string;
        type: DeviceType;
        locationId?: string;
        serialNumber?: string;
        stripeReaderId?: string;
    }): Promise<{
        type: import("@prisma/client").$Enums.DeviceType;
        name: string;
        id: string;
        status: import("@prisma/client").$Enums.DeviceStatus;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        locationId: string | null;
        serialNumber: string | null;
        stripeReaderId: string | null;
        stripeReaderLabel: string | null;
        lastSeenAt: Date | null;
        registeredAt: Date;
    }>;
    findAll(merchantId: string, locationId?: string): Promise<({
        location: {
            name: string;
        } | null;
    } & {
        type: import("@prisma/client").$Enums.DeviceType;
        name: string;
        id: string;
        status: import("@prisma/client").$Enums.DeviceStatus;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        locationId: string | null;
        serialNumber: string | null;
        stripeReaderId: string | null;
        stripeReaderLabel: string | null;
        lastSeenAt: Date | null;
        registeredAt: Date;
    })[]>;
    updateLastSeen(merchantId: string, deviceId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    getConnectionToken(merchantId: string, locationId: string): Promise<import("stripe").Stripe.Terminal.ConnectionToken>;
}
