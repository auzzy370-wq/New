import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantGuard } from '../auth/guards/merchant.guard';
import { MerchantId } from '../common/decorators/merchant.decorator';
import {
  BusinessInfoDto,
  BusinessTypeDto,
  BusinessAddressDto,
  OwnerInfoDto,
  CreateOnboardingLocationDto,
} from './dto/onboarding.dto';

@ApiTags('onboarding')
@Controller('onboarding')
@UseGuards(JwtAuthGuard, MerchantGuard)
@ApiBearerAuth('JWT')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get onboarding status and progress' })
  async getStatus(@MerchantId() merchantId: string) {
    return this.onboardingService.getStatus(merchantId);
  }

  @Put('business-info')
  @ApiOperation({ summary: 'Step 2: Update business information' })
  async updateBusinessInfo(
    @MerchantId() merchantId: string,
    @Body() dto: BusinessInfoDto,
  ) {
    return this.onboardingService.updateBusinessInfo(merchantId, dto);
  }

  @Put('business-type')
  @ApiOperation({ summary: 'Step 3: Update business type' })
  async updateBusinessType(
    @MerchantId() merchantId: string,
    @Body() dto: BusinessTypeDto,
  ) {
    return this.onboardingService.updateBusinessType(merchantId, dto);
  }

  @Put('business-address')
  @ApiOperation({ summary: 'Step 4: Update business address' })
  async updateBusinessAddress(
    @MerchantId() merchantId: string,
    @Body() dto: BusinessAddressDto,
  ) {
    return this.onboardingService.updateBusinessAddress(merchantId, dto);
  }

  @Put('owner-info')
  @ApiOperation({ summary: 'Step 5: Update owner information' })
  async updateOwnerInfo(
    @MerchantId() merchantId: string,
    @Body() dto: OwnerInfoDto,
  ) {
    return this.onboardingService.updateOwnerInfo(merchantId, dto);
  }

  @Post('stripe/connect')
  @ApiOperation({ summary: 'Step 6: Initiate Stripe Connect onboarding' })
  async initiateStripeConnect(@MerchantId() merchantId: string) {
    return this.onboardingService.initiateStripeConnect(merchantId);
  }

  @Get('stripe/return')
  @ApiOperation({ summary: 'Handle Stripe Connect onboarding return' })
  async handleStripeReturn(
    @Query('merchantId') merchantIdFromQuery: string,
    @MerchantId() merchantIdFromHeader: string,
  ) {
    const merchantId = merchantIdFromQuery || merchantIdFromHeader;
    return this.onboardingService.handleStripeConnectReturn(merchantId);
  }

  @Post('location')
  @ApiOperation({ summary: 'Step 10: Create first location' })
  async createLocation(
    @MerchantId() merchantId: string,
    @Body() dto: CreateOnboardingLocationDto,
  ) {
    return this.onboardingService.createOnboardingLocation(merchantId, dto);
  }

  @Post('test-transaction/complete')
  @ApiOperation({ summary: 'Step 14: Mark test transaction complete' })
  async markTestTransactionComplete(@MerchantId() merchantId: string) {
    return this.onboardingService.markTestTransactionComplete(merchantId);
  }

  @Post('complete')
  @ApiOperation({ summary: 'Step 15: Complete onboarding' })
  async complete(@MerchantId() merchantId: string) {
    return this.onboardingService.completeOnboarding(merchantId);
  }

  // Legacy route — also accessible from merchants controller
  @Get(':merchantId/status')
  @ApiOperation({ summary: 'Get onboarding status by merchant ID (path param)' })
  async getStatusByParam(@Param('merchantId') merchantId: string) {
    return this.onboardingService.getStatus(merchantId);
  }
}
