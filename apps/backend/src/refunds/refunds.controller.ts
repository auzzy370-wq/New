import { Controller, Get, Post, Body, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RefundsService } from './refunds.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantId } from '../common/decorators/merchant.decorator';

@ApiTags('refunds')
@Controller('refunds')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  async create(
    @MerchantId() merchantId: string,
    @Body() body: Parameters<RefundsService['createRefund']>[1],
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    return this.refundsService.createRefund(merchantId, { ...body, idempotencyKey });
  }

  @Get()
  async findAll(
    @MerchantId() merchantId: string,
    @Query('orderId') orderId?: string,
  ) {
    return this.refundsService.getRefunds(merchantId, orderId);
  }
}
