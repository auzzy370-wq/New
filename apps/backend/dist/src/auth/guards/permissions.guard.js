"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let PermissionsGuard = class PermissionsGuard {
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const isAdmin = this.reflector.getAllAndOverride(permissions_decorator_1.IS_ADMIN_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const requiredPermissions = this.reflector.getAllAndOverride(permissions_decorator_1.PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!isAdmin && !requiredPermissions?.length) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException('Authentication required');
        }
        if (user.role === client_1.UserRole.PLATFORM_ADMIN) {
            return true;
        }
        if (isAdmin) {
            throw new common_1.ForbiddenException('Admin access required');
        }
        if (!requiredPermissions?.length) {
            return true;
        }
        if (user.role === client_1.UserRole.MERCHANT_OWNER || user.role === client_1.UserRole.MERCHANT_ADMIN) {
            return true;
        }
        const merchantId = user.currentMerchantId;
        if (!merchantId) {
            throw new common_1.ForbiddenException('No merchant context');
        }
        const merchantUser = await this.prisma.merchantUser.findUnique({
            where: { merchantId_userId: { merchantId, userId: user.id } },
        });
        if (!merchantUser) {
            throw new common_1.ForbiddenException('Access denied to this merchant');
        }
        if (merchantUser.role === client_1.UserRole.MERCHANT_MANAGER) {
            const managerDenied = ['employees.manage', 'billing.manage', 'settings.manage'];
            const hasDenied = requiredPermissions.some((p) => managerDenied.includes(p));
            if (!hasDenied)
                return true;
        }
        const hasAllPermissions = requiredPermissions.every((perm) => merchantUser.permissions.includes(perm));
        if (!hasAllPermissions) {
            throw new common_1.ForbiddenException('Insufficient permissions');
        }
        return true;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService])
], PermissionsGuard);
//# sourceMappingURL=permissions.guard.js.map