import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    create(merchantId: string, body: Parameters<ProductsService['create']>[1]): Promise<{
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
    findAll(merchantId: string, page?: number, limit?: number, categoryId?: string, search?: string, isActive?: boolean): Promise<import("../common/utils/pagination.util").PaginatedResult<{
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
    createCategory(merchantId: string, body: {
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
    findOne(merchantId: string, id: string): Promise<{
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
    update(merchantId: string, id: string, body: object): Promise<{
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
}
