import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, IS_ADMIN_KEY } from '../../common/decorators/permissions.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/request.types';
import { UserRole } from '@prisma/client';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAdmin = this.reflector.getAllAndOverride<boolean>(IS_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isAdmin && !requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Platform admin can do anything
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return true;
    }

    if (isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    if (!requiredPermissions?.length) {
      return true;
    }

    // Owner and Admin have all permissions within their merchant
    if (user.role === UserRole.MERCHANT_OWNER || user.role === UserRole.MERCHANT_ADMIN) {
      return true;
    }

    const merchantId = user.currentMerchantId;
    if (!merchantId) {
      throw new ForbiddenException('No merchant context');
    }

    const merchantUser = await this.prisma.merchantUser.findUnique({
      where: { merchantId_userId: { merchantId, userId: user.id } },
    });

    if (!merchantUser) {
      throw new ForbiddenException('Access denied to this merchant');
    }

    // Manager has most permissions
    if (merchantUser.role === UserRole.MERCHANT_MANAGER) {
      const managerDenied = ['employees.manage', 'billing.manage', 'settings.manage'];
      const hasDenied = requiredPermissions.some((p) => managerDenied.includes(p));
      if (!hasDenied) return true;
    }

    // Check specific permissions for custom roles
    const hasAllPermissions = requiredPermissions.every((perm) =>
      merchantUser.permissions.includes(perm),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
