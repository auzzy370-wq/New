import { PrismaService } from '../common/prisma/prisma.service';
export declare class ProductsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(merchantId: string, data: {
        name: string;
        description?: string;
        sku?: string;
        barcode?: string;
        price: number;
        cost?: number;
        categoryId?: string;
        imageUrl?: string;
        isTaxable?: boolean;
        trackInventory?: boolean;
        isActive?: boolean;
    }): Promise<{
        category: {
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            merchantId: string;
            isActive: boolean;
            imageUrl: string | null;
            sortOrder: number;
            color: string | null;
        } | null;
        variants: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            options: import("@prisma/client/runtime/library").JsonValue;
            isActive: boolean;
            price: import("@prisma/client/runtime/library").Decimal | null;
            cost: import("@prisma/client/runtime/library").Decimal | null;
            sku: string | null;
            barcode: string | null;
            imageUrl: string | null;
            sortOrder: number;
            productId: string;
        }[];
        modifierGroups: ({
            modifiers: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                isActive: boolean;
                isDefault: boolean;
                price: import("@prisma/client/runtime/library").Decimal;
                sortOrder: number;
                modifierGroupId: string;
            }[];
        } & {
            required: boolean;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            sortOrder: number;
            productId: string;
            multiSelect: boolean;
            minSelect: number;
            maxSelect: number | null;
        })[];
    } & {
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
    }>;
    findAll(merchantId: string, params: {
        page?: number;
        limit?: number;
        categoryId?: string;
        search?: string;
        isActive?: boolean;
    }): Promise<import("../common/utils/pagination.util").PaginatedResult<{
        category: {
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            merchantId: string;
            isActive: boolean;
            imageUrl: string | null;
            sortOrder: number;
            color: string | null;
        } | null;
        variants: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            options: import("@prisma/client/runtime/library").JsonValue;
            isActive: boolean;
            price: import("@prisma/client/runtime/library").Decimal | null;
            cost: import("@prisma/client/runtime/library").Decimal | null;
            sku: string | null;
            barcode: string | null;
            imageUrl: string | null;
            sortOrder: number;
            productId: string;
        }[];
        modifierGroups: ({
            modifiers: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                isActive: boolean;
                isDefault: boolean;
                price: import("@prisma/client/runtime/library").Decimal;
                sortOrder: number;
                modifierGroupId: string;
            }[];
        } & {
            required: boolean;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            sortOrder: number;
            productId: string;
            multiSelect: boolean;
            minSelect: number;
            maxSelect: number | null;
        })[];
    } & {
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
    }>>;
    findById(merchantId: string, id: string): Promise<{
        category: {
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            merchantId: string;
            isActive: boolean;
            imageUrl: string | null;
            sortOrder: number;
            color: string | null;
        } | null;
        inventory: ({
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
            updatedAt: Date;
            merchantId: string;
            lowStockThreshold: number;
            locationId: string;
            productId: string;
            variantId: string | null;
            quantity: number;
        })[];
        taxes: ({
            tax: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                merchantId: string;
                isActive: boolean;
                isDefault: boolean;
                rate: import("@prisma/client/runtime/library").Decimal;
                isInclusive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            taxId: string;
            productId: string;
        })[];
        variants: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            options: import("@prisma/client/runtime/library").JsonValue;
            isActive: boolean;
            price: import("@prisma/client/runtime/library").Decimal | null;
            cost: import("@prisma/client/runtime/library").Decimal | null;
            sku: string | null;
            barcode: string | null;
            imageUrl: string | null;
            sortOrder: number;
            productId: string;
        }[];
        modifierGroups: ({
            modifiers: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                isActive: boolean;
                isDefault: boolean;
                price: import("@prisma/client/runtime/library").Decimal;
                sortOrder: number;
                modifierGroupId: string;
            }[];
        } & {
            required: boolean;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            sortOrder: number;
            productId: string;
            multiSelect: boolean;
            minSelect: number;
            maxSelect: number | null;
        })[];
    } & {
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
    }>;
    update(merchantId: string, id: string, data: Partial<{
        name: string;
        description: string;
        sku: string;
        barcode: string;
        price: number;
        cost: number;
        categoryId: string;
        imageUrl: string;
        isTaxable: boolean;
        trackInventory: boolean;
        isActive: boolean;
        sortOrder: number;
    }>): Promise<{
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
    }>;
    delete(merchantId: string, id: string): Promise<{
        success: boolean;
    }>;
    createCategory(merchantId: string, data: {
        name: string;
        description?: string;
        color?: string;
    }): Promise<{
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        isActive: boolean;
        imageUrl: string | null;
        sortOrder: number;
        color: string | null;
    }>;
    getCategories(merchantId: string): Promise<({
        _count: {
            products: number;
        };
    } & {
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        isActive: boolean;
        imageUrl: string | null;
        sortOrder: number;
        color: string | null;
    })[]>;
}
