import { Controller, Get, Post, Body, Param, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantId } from '../common/decorators/merchant.decorator';
import { PaymentMethod } from '@prisma/client';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a payment intent for card-present payment' })
  async createIntent(
    @MerchantId() merchantId: string,
    @Body() body: { orderId: string; paymentMethod: PaymentMethod },
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    return this.paymentsService.createPaymentIntent(merchantId, {
      orderId: body.orderId,
      paymentMethod: body.paymentMethod,
      idempotencyKey: idempotencyKey || `pi-${body.orderId}-${Date.now()}`,
    });
  }

  @Post('cash')
  @ApiOperation({ summary: 'Process a cash payment' })
  async processCash(
    @MerchantId() merchantId: string,
    @Body() body: { orderId: string; amount: number; tendered: number; employeeId?: string },
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    return this.paymentsService.processCashPayment(merchantId, {
      ...body,
      idempotencyKey: idempotencyKey || `cash-${body.orderId}-${Date.now()}`,
    });
  }

  @Post('confirm/:paymentIntentId')
  @ApiOperation({ summary: 'Confirm payment after terminal processing' })
  async confirm(
    @MerchantId() merchantId: string,
    @Param('paymentIntentId') paymentIntentId: string,
  ) {
    return this.paymentsService.confirmPayment(merchantId, paymentIntentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  async getPayment(@MerchantId() merchantId: string, @Param('id') id: string) {
    return this.paymentsService.getPayment(merchantId, id);
  }
}
