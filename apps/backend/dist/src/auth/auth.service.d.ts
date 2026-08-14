import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '@prisma/client';
import { EmailService } from '../notifications/email/email.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly configService;
    private readonly redis;
    private readonly emailService;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService, redis: RedisService, emailService: EmailService);
    register(dto: RegisterDto): Promise<{
        message: string;
        userId: string;
    }>;
    login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<{
        requiresMfa: boolean;
        userId: string;
    } | {
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        user: {
            email: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            id: string;
            role: import("@prisma/client").$Enums.UserRole;
            status: import("@prisma/client").$Enums.UserStatus;
            emailVerified: boolean;
            emailVerificationExpiry: Date | null;
            passwordResetExpiry: Date | null;
            mfaEnabled: boolean;
            lastLoginAt: Date | null;
            lastLoginIp: string | null;
            avatarUrl: string | null;
            timezone: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        };
        merchant: {
            platformFeeRate: import("@prisma/client/runtime/library").Decimal;
            name: string;
            description: string | null;
            email: string;
            phone: string | null;
            id: string;
            status: import("@prisma/client").$Enums.MerchantStatus;
            timezone: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            slug: string;
            website: string | null;
            logoUrl: string | null;
            businessType: string | null;
            businessCategory: string | null;
            taxId: string | null;
            onboardingStep: number;
            onboardingCompleted: boolean;
            stripeAccountId: string | null;
            stripeAccountStatus: string | null;
            stripeOnboardingComplete: boolean;
            stripePayoutsEnabled: boolean;
            stripeChargesEnabled: boolean;
            subscriptionStatus: import("@prisma/client").$Enums.SubscriptionStatus | null;
            subscriptionCurrentPeriodEnd: Date | null;
            trialEndsAt: Date | null;
            addressLine1: string | null;
            addressLine2: string | null;
            city: string | null;
            state: string | null;
            postalCode: string | null;
            country: string;
            currency: string;
        } | undefined;
        requiresMfa?: undefined;
        userId?: undefined;
    }>;
    validateUser(email: string, password: string): Promise<User>;
    refreshTokens(refreshToken: string, ipAddress?: string): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
    }>;
    logout(userId: string, sessionId: string): Promise<void>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    requestPasswordReset(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    setupMfa(userId: string): Promise<{
        secret: string;
        qrCodeDataUrl: string;
        otpauthUrl: string;
    }>;
    confirmMfa(userId: string, code: string): Promise<{
        backupCodes: string[];
    }>;
    disableMfa(userId: string, code: string): Promise<{
        message: string;
    }>;
    switchMerchant(userId: string, merchantId: string): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
    }>;
    private generateTokens;
    private verifyMfaCode;
    private validateMfaBackupCode;
    sanitizeUser(user: User): {
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        id: string;
        role: import("@prisma/client").$Enums.UserRole;
        status: import("@prisma/client").$Enums.UserStatus;
        emailVerified: boolean;
        emailVerificationExpiry: Date | null;
        passwordResetExpiry: Date | null;
        mfaEnabled: boolean;
        lastLoginAt: Date | null;
        lastLoginIp: string | null;
        avatarUrl: string | null;
        timezone: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    };
}
