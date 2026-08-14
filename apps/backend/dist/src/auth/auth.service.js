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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../common/prisma/prisma.service");
const redis_service_1 = require("../common/redis/redis.service");
const bcrypt = require("bcryptjs");
const otplib_1 = require("otplib");
const qrcode = require("qrcode");
const uuid_1 = require("uuid");
const client_1 = require("@prisma/client");
const email_service_1 = require("../notifications/email/email.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwtService, configService, redis, emailService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.redis = redis;
        this.emailService = emailService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async register(dto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });
        if (existingUser) {
            throw new common_1.ConflictException('An account with this email already exists');
        }
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const verificationToken = (0, uuid_1.v4)();
        const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email.toLowerCase(),
                passwordHash,
                firstName: dto.firstName,
                lastName: dto.lastName,
                phone: dto.phone,
                status: client_1.UserStatus.PENDING_VERIFICATION,
                emailVerificationToken: verificationToken,
                emailVerificationExpiry: verificationExpiry,
            },
        });
        await this.emailService.sendVerificationEmail(user.email, user.firstName, verificationToken);
        this.logger.log(`New user registered: ${user.email}`);
        return {
            message: 'Registration successful. Please check your email to verify your account.',
            userId: user.id,
        };
    }
    async login(dto, ipAddress, userAgent) {
        const user = await this.validateUser(dto.email, dto.password);
        if (user.status === client_1.UserStatus.SUSPENDED) {
            throw new common_1.UnauthorizedException('Your account has been suspended. Please contact support.');
        }
        if (!user.emailVerified && user.status === client_1.UserStatus.PENDING_VERIFICATION) {
            throw new common_1.UnauthorizedException('Please verify your email address before logging in.');
        }
        if (user.mfaEnabled) {
            if (!dto.mfaCode) {
                return {
                    requiresMfa: true,
                    userId: user.id,
                };
            }
            const isValidMfa = this.verifyMfaCode(user.mfaSecret, dto.mfaCode);
            if (!isValidMfa) {
                const isBackupCode = await this.validateMfaBackupCode(user.id, dto.mfaCode);
                if (!isBackupCode) {
                    throw new common_1.UnauthorizedException('Invalid MFA code');
                }
            }
        }
        const merchantUser = await this.prisma.merchantUser.findFirst({
            where: { userId: user.id },
            include: { merchant: true },
            orderBy: { createdAt: 'asc' },
        });
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
                lastLoginIp: ipAddress,
                status: client_1.UserStatus.ACTIVE,
            },
        });
        const tokens = await this.generateTokens(user, merchantUser?.merchantId);
        await this.prisma.userSession.create({
            data: {
                userId: user.id,
                sessionId: tokens.sessionId,
                ipAddress,
                userAgent,
                lastActiveAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });
        return {
            user: this.sanitizeUser(user),
            merchant: merchantUser?.merchant,
            ...tokens,
        };
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        return user;
    }
    async refreshTokens(refreshToken, ipAddress) {
        let payload;
        try {
            payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('jwt.refreshSecret'),
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const storedToken = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });
        if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
            if (storedToken) {
                await this.prisma.refreshToken.updateMany({
                    where: { family: storedToken.family },
                    data: { isRevoked: true },
                });
            }
            throw new common_1.UnauthorizedException('Refresh token is invalid or expired');
        }
        await this.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { isRevoked: true },
        });
        const tokens = await this.generateTokens(storedToken.user, payload.merchantId, storedToken.family);
        return tokens;
    }
    async logout(userId, sessionId) {
        await this.prisma.refreshToken.updateMany({
            where: { userId, isRevoked: false },
            data: { isRevoked: true },
        });
        await this.prisma.userSession.deleteMany({
            where: { userId, sessionId },
        });
    }
    async verifyEmail(token) {
        const user = await this.prisma.user.findUnique({
            where: { emailVerificationToken: token },
        });
        if (!user) {
            throw new common_1.BadRequestException('Invalid verification token');
        }
        if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
            throw new common_1.BadRequestException('Verification token has expired. Please request a new one.');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerificationToken: null,
                emailVerificationExpiry: null,
                status: client_1.UserStatus.ACTIVE,
            },
        });
        return { message: 'Email verified successfully. You can now log in.' };
    }
    async requestPasswordReset(email) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!user) {
            return { message: 'If an account with this email exists, a reset link has been sent.' };
        }
        const resetToken = (0, uuid_1.v4)();
        const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: resetToken,
                passwordResetExpiry: resetExpiry,
            },
        });
        await this.emailService.sendPasswordResetEmail(user.email, user.firstName, resetToken);
        return { message: 'If an account with this email exists, a reset link has been sent.' };
    }
    async resetPassword(token, newPassword) {
        const user = await this.prisma.user.findUnique({
            where: { passwordResetToken: token },
        });
        if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
            throw new common_1.BadRequestException('Invalid or expired password reset token');
        }
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                passwordResetToken: null,
                passwordResetExpiry: null,
            },
        });
        await this.prisma.refreshToken.updateMany({
            where: { userId: user.id },
            data: { isRevoked: true },
        });
        return { message: 'Password reset successfully. You can now log in with your new password.' };
    }
    async setupMfa(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const secret = otplib_1.authenticator.generateSecret();
        const appName = 'TapFlow POS';
        const otpauthUrl = otplib_1.authenticator.keyuri(user.email, appName, secret);
        const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
        await this.redis.set(`mfa:setup:${userId}`, secret, 600);
        return {
            secret,
            qrCodeDataUrl,
            otpauthUrl,
        };
    }
    async confirmMfa(userId, code) {
        const secret = await this.redis.get(`mfa:setup:${userId}`);
        if (!secret) {
            throw new common_1.BadRequestException('MFA setup session expired. Please start again.');
        }
        const isValid = otplib_1.authenticator.verify({ token: code, secret });
        if (!isValid) {
            throw new common_1.BadRequestException('Invalid MFA code');
        }
        const backupCodes = Array.from({ length: 8 }, () => Math.random().toString(36).substring(2, 10).toUpperCase());
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                mfaEnabled: true,
                mfaSecret: secret,
                mfaBackupCodes: backupCodes,
            },
        });
        await this.redis.del(`mfa:setup:${userId}`);
        return { backupCodes };
    }
    async disableMfa(userId, code) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (!user.mfaEnabled || !user.mfaSecret) {
            throw new common_1.BadRequestException('MFA is not enabled');
        }
        const isValid = otplib_1.authenticator.verify({ token: code, secret: user.mfaSecret });
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid MFA code');
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                mfaEnabled: false,
                mfaSecret: null,
                mfaBackupCodes: [],
            },
        });
        return { message: 'MFA disabled successfully' };
    }
    async switchMerchant(userId, merchantId) {
        const merchantUser = await this.prisma.merchantUser.findUnique({
            where: { merchantId_userId: { merchantId, userId } },
            include: { merchant: true, user: true },
        });
        if (!merchantUser) {
            throw new common_1.NotFoundException('Merchant not found or access denied');
        }
        const tokens = await this.generateTokens(merchantUser.user, merchantId);
        return tokens;
    }
    async generateTokens(user, merchantId, existingFamily) {
        const jti = (0, uuid_1.v4)();
        const sessionId = (0, uuid_1.v4)();
        const family = existingFamily || (0, uuid_1.v4)();
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            jti,
            merchantId,
        };
        const accessToken = this.jwtService.sign(payload);
        const refreshPayload = { ...payload, jti: (0, uuid_1.v4)() };
        const refreshToken = this.jwtService.sign(refreshPayload, {
            secret: this.configService.get('jwt.refreshSecret'),
            expiresIn: this.configService.get('jwt.refreshExpiresIn'),
        });
        const refreshExpiresIn = 30 * 24 * 60 * 60 * 1000;
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: refreshToken,
                family,
                expiresAt: new Date(Date.now() + refreshExpiresIn),
            },
        });
        return { accessToken, refreshToken, sessionId };
    }
    verifyMfaCode(secret, code) {
        return otplib_1.authenticator.verify({ token: code, secret });
    }
    async validateMfaBackupCode(userId, code) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const index = user.mfaBackupCodes.indexOf(code.toUpperCase());
        if (index === -1)
            return false;
        const newCodes = [...user.mfaBackupCodes];
        newCodes.splice(index, 1);
        await this.prisma.user.update({
            where: { id: userId },
            data: { mfaBackupCodes: newCodes },
        });
        return true;
    }
    sanitizeUser(user) {
        const { passwordHash, mfaSecret, mfaBackupCodes, emailVerificationToken, passwordResetToken, ...safe } = user;
        void passwordHash;
        void mfaSecret;
        void mfaBackupCodes;
        void emailVerificationToken;
        void passwordResetToken;
        return safe;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        redis_service_1.RedisService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map