import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantId } from '../common/decorators/merchant.decorator';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  async create(@MerchantId() merchantId: string, @Body() body: Parameters<CustomersService['create']>[1]) {
    return this.customersService.create(merchantId, body);
  }

  @Get()
  async findAll(@MerchantId() merchantId: string, @Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.customersService.findAll(merchantId, { page, limit, search });
  }

  @Get(':id')
  async findOne(@MerchantId() merchantId: string, @Param('id') id: string) {
    return this.customersService.findById(merchantId, id);
  }

  @Put(':id')
  async update(@MerchantId() merchantId: string, @Param('id') id: string, @Body() body: object) {
    return this.customersService.update(merchantId, id, body);
  }

  @Delete(':id')
  async delete(@MerchantId() merchantId: string, @Param('id') id: string) {
    return this.customersService.delete(merchantId, id);
  }
}
