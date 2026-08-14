import { InventoryService } from './inventory.service';
import { InventoryMovementType } from '@prisma/client';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    getInventory(merchantId: string, locationId?: string, productId?: string): Promise<({
        location: {
            name: string;
        };
        product: {
            name: string;
            sku: string | null;
            imageUrl: string | null;
        };
        variant: {
            name: string;
            sku: string | null;
        } | null;
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
    })[]>;
    getLowStock(merchantId: string): Promise<({
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
        product: {
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            merchantId: string;
            isActive: boolean;
            trackInventory: boolean;
            price: import("@prisma/client/runtime/library").Decimal;
            cost: import("@prisma/client/runtime/library").Decimal | null;
            sku: string | null;
            barcode: string | null;
            categoryId: string | null;
            imageUrl: string | null;
            isTaxable: boolean;
            allowNegativeInventory: boolean;
            sortOrder: number;
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
    })[]>;
    adjust(merchantId: string, body: {
        locationId: string;
        productId: string;
        variantId?: string;
        quantity: number;
        type: InventoryMovementType;
        notes?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        lowStockThreshold: number;
        locationId: string;
        productId: string;
        variantId: string | null;
        quantity: number;
    }>;
    getMovements(merchantId: string, inventoryId?: string, productId?: string): Promise<({
        inventory: {
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
        };
    } & {
        type: import("@prisma/client").$Enums.InventoryMovementType;
        id: string;
        createdAt: Date;
        merchantId: string;
        quantity: number;
        inventoryId: string;
        quantityBefore: number;
        quantityAfter: number;
        orderId: string | null;
        employeeId: string | null;
        notes: string | null;
    })[]>;
}
