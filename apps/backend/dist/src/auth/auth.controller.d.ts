import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ConfirmMfaDto } from './dto/confirm-mfa.dto';
import { AuthenticatedUser } from '../common/types/request.types';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        message: string;
        userId: string;
    }>;
    login(dto: LoginDto, ip: string, userAgent: string, res: Response): Promise<{
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
    refresh(req: Request, res: Response): Promise<{
        message: string;
        accessToken?: undefined;
    } | {
        accessToken: string;
        message?: undefined;
    }>;
    logout(user: AuthenticatedUser, req: Request, res: Response): Promise<{
        message: string;
    }>;
    getMe(user: AuthenticatedUser): Promise<{
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
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    setupMfa(user: AuthenticatedUser): Promise<{
        secret: string;
        qrCodeDataUrl: string;
        otpauthUrl: string;
    }>;
    confirmMfa(user: AuthenticatedUser, dto: ConfirmMfaDto): Promise<{
        backupCodes: string[];
    }>;
    disableMfa(user: AuthenticatedUser, dto: ConfirmMfaDto): Promise<{
        message: string;
    }>;
    switchMerchant(user: AuthenticatedUser, merchantId: string): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
    }>;
}
