import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantId } from '../common/decorators/merchant.decorator';
import { OrderStatus } from '@prisma/client';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(@MerchantId() merchantId: string, @Body() body: Parameters<OrdersService['create']>[1]) {
    return this.ordersService.create(merchantId, body);
  }

  @Get()
  async findAll(
    @MerchantId() merchantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: OrderStatus,
    @Query('locationId') locationId?: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.findAll(merchantId, {
      page, limit, status, locationId, customerId, search,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('stats')
  async getStats(
    @MerchantId() merchantId: string,
    @Query('locationId') locationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.getStats(
      merchantId, locationId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  async findOne(@MerchantId() merchantId: string, @Param('id') id: string) {
    return this.ordersService.findById(merchantId, id);
  }

  @Put(':id/status')
  async updateStatus(
    @MerchantId() merchantId: string,
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateStatus(merchantId, id, status);
  }
}
