import { CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
export declare class MerchantGuard implements CanActivate {
    private readonly prisma;
    constructor(prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
