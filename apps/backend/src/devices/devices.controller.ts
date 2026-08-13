import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantId } from '../common/decorators/merchant.decorator';

@ApiTags('devices')
@Controller('devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  async register(@MerchantId() merchantId: string, @Body() body: Parameters<DevicesService['register']>[1]) {
    return this.devicesService.register(merchantId, body);
  }

  @Get()
  async findAll(@MerchantId() merchantId: string, @Query('locationId') locationId?: string) {
    return this.devicesService.findAll(merchantId, locationId);
  }

  @Post('connection-token')
  async getConnectionToken(@MerchantId() merchantId: string, @Body('locationId') locationId: string) {
    return this.devicesService.getConnectionToken(merchantId, locationId);
  }
}
