import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../common/types/request.types';
import { User, UserStatus } from '@prisma/client';
import { EmailService } from '../notifications/email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const verificationToken = uuidv4();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        status: UserStatus.PENDING_VERIFICATION,
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

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.validateUser(dto.email, dto.password);

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account has been suspended. Please contact support.');
    }

    if (!user.emailVerified && user.status === UserStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException('Please verify your email address before logging in.');
    }

    // MFA check
    if (user.mfaEnabled) {
      if (!dto.mfaCode) {
        return {
          requiresMfa: true,
          userId: user.id,
        };
      }

      const isValidMfa = this.verifyMfaCode(user.mfaSecret!, dto.mfaCode);
      if (!isValidMfa) {
        // Check backup codes
        const isBackupCode = await this.validateMfaBackupCode(user.id, dto.mfaCode);
        if (!isBackupCode) {
          throw new UnauthorizedException('Invalid MFA code');
        }
      }
    }

    // Get merchant context
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
        status: UserStatus.ACTIVE,
      },
    });

    const tokens = await this.generateTokens(user, merchantUser?.merchantId);

    // Create session
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

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  async refreshTokens(refreshToken: string, ipAddress?: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      // Possible token reuse attack - revoke entire family
      if (storedToken) {
        await this.prisma.refreshToken.updateMany({
          where: { family: storedToken.family },
          data: { isRevoked: true },
        });
      }
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // Rotate: revoke old token, issue new pair
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const tokens = await this.generateTokens(storedToken.user, payload.merchantId, storedToken.family);

    return tokens;
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    await this.prisma.userSession.deleteMany({
      where: { userId, sessionId },
    });
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
      throw new BadRequestException('Verification token has expired. Please request a new one.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        status: UserStatus.ACTIVE,
      },
    });

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent user enumeration
    if (!user) {
      return { message: 'If an account with this email exists, a reset link has been sent.' };
    }

    const resetToken = uuidv4();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

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

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired password reset token');
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

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }

  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const secret = authenticator.generateSecret();
    const appName = 'TapFlow POS';
    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    // Store secret temporarily in Redis until confirmed
    await this.redis.set(`mfa:setup:${userId}`, secret, 600);

    return {
      secret,
      qrCodeDataUrl,
      otpauthUrl,
    };
  }

  async confirmMfa(userId: string, code: string) {
    const secret = await this.redis.get(`mfa:setup:${userId}`);
    if (!secret) {
      throw new BadRequestException('MFA setup session expired. Please start again.');
    }

    const isValid = authenticator.verify({ token: code, secret });
    if (!isValid) {
      throw new BadRequestException('Invalid MFA code');
    }

    const backupCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase(),
    );

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

  async disableMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled');
    }

    const isValid = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
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

  async switchMerchant(userId: string, merchantId: string) {
    const merchantUser = await this.prisma.merchantUser.findUnique({
      where: { merchantId_userId: { merchantId, userId } },
      include: { merchant: true, user: true },
    });

    if (!merchantUser) {
      throw new NotFoundException('Merchant not found or access denied');
    }

    const tokens = await this.generateTokens(merchantUser.user, merchantId);
    return tokens;
  }

  private async generateTokens(user: User, merchantId?: string, existingFamily?: string) {
    const jti = uuidv4();
    const sessionId = uuidv4();
    const family = existingFamily || uuidv4();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
      merchantId,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshPayload: JwtPayload = { ...payload, jti: uuidv4() };
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

  private verifyMfaCode(secret: string, code: string): boolean {
    return authenticator.verify({ token: code, secret });
  }

  private async validateMfaBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const index = user.mfaBackupCodes.indexOf(code.toUpperCase());

    if (index === -1) return false;

    // Remove used backup code
    const newCodes = [...user.mfaBackupCodes];
    newCodes.splice(index, 1);
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaBackupCodes: newCodes },
    });

    return true;
  }

  sanitizeUser(user: User) {
    const { passwordHash, mfaSecret, mfaBackupCodes, emailVerificationToken, passwordResetToken, ...safe } = user;
    void passwordHash; void mfaSecret; void mfaBackupCodes;
    void emailVerificationToken; void passwordResetToken;
    return safe;
  }
}
