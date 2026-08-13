import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser, RequestWithUser } from '../../common/types/request.types';
import { UserRole } from '@prisma/client';

@Injectable()
export class MerchantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user: AuthenticatedUser = request.user;

    if (!user) return false;

    // Platform admin bypasses merchant check
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return true;
    }

    const merchantId = user.currentMerchantId || request.headers['x-merchant-id'] as string;

    if (!merchantId) {
      throw new ForbiddenException('Merchant context required. Include X-Merchant-ID header.');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId, deletedAt: null },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const merchantUser = await this.prisma.merchantUser.findUnique({
      where: { merchantId_userId: { merchantId, userId: user.id } },
    });

    if (!merchantUser) {
      throw new ForbiddenException('You do not have access to this merchant');
    }

    // Attach merchant to request for downstream use
    request.merchant = merchant;

    return true;
  }
}
