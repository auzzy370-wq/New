import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { JwtPayload } from '../../common/types/request.types';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly configService;
    private readonly prisma;
    private readonly redis;
    constructor(configService: ConfigService, prisma: PrismaService, redis: RedisService);
    validate(payload: JwtPayload): Promise<{
        currentMerchantId: string | undefined;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        id: string;
        passwordHash: string;
        role: import("@prisma/client").$Enums.UserRole;
        status: import("@prisma/client").$Enums.UserStatus;
        emailVerified: boolean;
        emailVerificationToken: string | null;
        emailVerificationExpiry: Date | null;
        passwordResetToken: string | null;
        passwordResetExpiry: Date | null;
        mfaEnabled: boolean;
        mfaSecret: string | null;
        mfaBackupCodes: string[];
        lastLoginAt: Date | null;
        lastLoginIp: string | null;
        avatarUrl: string | null;
        timezone: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
}
export {};
