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
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/request.types';
import { ConfigService } from '@nestjs/config';

@ApiTags('merchants')
@Controller('merchants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class MerchantsController {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new merchant' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMerchantDto,
  ) {
    return this.merchantsService.create(user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get all merchants for current user' })
  async getMyMerchants(@CurrentUser() user: AuthenticatedUser) {
    return this.merchantsService.getUserMerchants(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get merchant by ID' })
  async findOne(@Param('id') id: string) {
    return this.merchantsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update merchant information' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMerchantDto,
  ) {
    return this.merchantsService.update(id, dto);
  }

  @Get(':id/onboarding')
  @ApiOperation({ summary: 'Get merchant onboarding status' })
  async getOnboarding(@Param('id') id: string) {
    return this.merchantsService.getOnboardingStatus(id);
  }

  @Post(':id/stripe/onboard')
  @ApiOperation({ summary: 'Initiate Stripe Connect onboarding' })
  async initiateStripeOnboarding(@Param('id') id: string) {
    const frontendUrl = this.configService.get<string>('app.frontendUrl')!;
    return this.merchantsService.initiateStripeOnboarding(id, frontendUrl);
  }

  @Get(':id/stripe/return')
  @ApiOperation({ summary: 'Handle Stripe Connect onboarding return' })
  async handleStripeReturn(@Param('id') id: string) {
    return this.merchantsService.handleStripeOnboardingReturn(id);
  }

  @Get(':id/stripe/dashboard')
  @ApiOperation({ summary: 'Get Stripe Express dashboard link' })
  async getStripeDashboard(@Param('id') id: string) {
    return this.merchantsService.getStripeLoginLink(id);
  }
}
