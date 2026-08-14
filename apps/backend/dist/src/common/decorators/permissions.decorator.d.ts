export declare const PERMISSIONS_KEY = "permissions";
export declare const RequirePermissions: (...permissions: string[]) => import("@nestjs/common").CustomDecorator<string>;
export declare const IS_PUBLIC_KEY = "isPublic";
export declare const Public: () => import("@nestjs/common").CustomDecorator<string>;
export declare const IS_ADMIN_KEY = "isAdmin";
export declare const AdminOnly: () => import("@nestjs/common").CustomDecorator<string>;
