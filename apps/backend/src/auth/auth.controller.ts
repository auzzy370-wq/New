import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  Delete,
  Patch,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ConfirmMfaDto } from './dto/confirm-mfa.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/request.types';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user account' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, ip, userAgent);

    if ('requiresMfa' in result) {
      return result;
    }

    // Set refresh token as httpOnly cookie
    if ('refreshToken' in result) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });
    }

    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refreshToken'] || req.body?.refreshToken;
    if (!refreshToken) {
      return { message: 'No refresh token provided' };
    }

    const tokens = await this.authService.refreshTokens(refreshToken);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    return { accessToken: tokens.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Logout current session' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = (req as unknown as { user: { sessionId?: string } }).user?.sessionId || '';
    await this.authService.logout(user.id, sessionId);

    res.clearCookie('refreshToken', { path: '/api/v1/auth' });

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.sanitizeUser(user);
  }

  @Public()
  @Get('verify-email/:token')
  @ApiOperation({ summary: 'Verify email address' })
  async verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Request password reset' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/setup')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Initialize MFA setup' })
  async setupMfa(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.setupMfa(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/confirm')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Confirm and activate MFA' })
  async confirmMfa(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmMfaDto,
  ) {
    return this.authService.confirmMfa(user.id, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('mfa')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Disable MFA' })
  async disableMfa(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmMfaDto,
  ) {
    return this.authService.disableMfa(user.id, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('switch-merchant/:merchantId')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Switch active merchant context' })
  async switchMerchant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('merchantId') merchantId: string,
  ) {
    return this.authService.switchMerchant(user.id, merchantId);
  }
}
