import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantGuard } from '../auth/guards/merchant.guard';
import { MerchantId } from '../common/decorators/merchant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/request.types';

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, MerchantGuard)
@ApiBearerAuth('JWT')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current subscription' })
  async getSubscription(@MerchantId() merchantId: string) {
    return this.subscriptionsService.getSubscription(merchantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create $25/month subscription' })
  async create(
    @MerchantId() merchantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { merchantName: string; paymentMethodId?: string },
  ) {
    return this.subscriptionsService.createSubscription(merchantId, {
      email: user.email,
      merchantName: body.merchantName,
      paymentMethodId: body.paymentMethodId,
    });
  }

  @Post('setup-intent')
  @ApiOperation({ summary: 'Create a Stripe SetupIntent for payment method collection' })
  async createSetupIntent(@MerchantId() merchantId: string) {
    return this.subscriptionsService.createSetupIntent(merchantId);
  }

  @Delete()
  @ApiOperation({ summary: 'Cancel subscription (at period end)' })
  async cancel(@MerchantId() merchantId: string) {
    return this.subscriptionsService.cancelSubscription(merchantId);
  }

  @Post('reactivate')
  @ApiOperation({ summary: 'Reactivate a cancelled subscription' })
  async reactivate(@MerchantId() merchantId: string) {
    return this.subscriptionsService.reactivateSubscription(merchantId);
  }

  @Post('billing-portal')
  @ApiOperation({ summary: 'Get Stripe Billing Portal session URL' })
  async getBillingPortal(@MerchantId() merchantId: string) {
    return this.subscriptionsService.getBillingPortal(merchantId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Get billing invoices' })
  async getInvoices(@MerchantId() merchantId: string) {
    return this.subscriptionsService.getInvoices(merchantId);
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'Get saved payment methods' })
  async getPaymentMethods(@MerchantId() merchantId: string) {
    return this.subscriptionsService.getPaymentMethods(merchantId);
  }

  @Put('payment-method')
  @ApiOperation({ summary: 'Update default payment method' })
  async updatePaymentMethod(
    @MerchantId() merchantId: string,
    @Body() body: { paymentMethodId: string },
  ) {
    return this.subscriptionsService.updatePaymentMethod(merchantId, body.paymentMethodId);
  }
}
