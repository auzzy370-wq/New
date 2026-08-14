import { DevicesService } from './devices.service';
export declare class DevicesController {
    private readonly devicesService;
    constructor(devicesService: DevicesService);
    register(merchantId: string, body: Parameters<DevicesService['register']>[1]): Promise<{
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
    getConnectionToken(merchantId: string, locationId: string): Promise<import("stripe").Stripe.Terminal.ConnectionToken>;
}
