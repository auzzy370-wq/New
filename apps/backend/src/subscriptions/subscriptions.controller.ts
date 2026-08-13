import { Controller, Get, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantId } from '../common/decorators/merchant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/request.types';

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  async getSubscription(@MerchantId() merchantId: string) {
    return this.subscriptionsService.getSubscription(merchantId);
  }

  @Post()
  async create(
    @MerchantId() merchantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { merchantName: string },
  ) {
    return this.subscriptionsService.createSubscription(merchantId, {
      email: user.email,
      merchantName: body.merchantName,
    });
  }

  @Delete()
  async cancel(@MerchantId() merchantId: string) {
    return this.subscriptionsService.cancelSubscription(merchantId);
  }

  @Get('invoices')
  async getInvoices(@MerchantId() merchantId: string) {
    return this.subscriptionsService.getInvoices(merchantId);
  }
}
