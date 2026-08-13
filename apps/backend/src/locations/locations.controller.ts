import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantId } from '../common/decorators/merchant.decorator';

@ApiTags('locations')
@Controller('locations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  async create(@MerchantId() merchantId: string, @Body() body: {
    name: string; addressLine1?: string; city?: string; state?: string;
    postalCode?: string; country?: string; timezone?: string; phone?: string; email?: string;
  }) {
    return this.locationsService.create(merchantId, body);
  }

  @Get()
  async findAll(@MerchantId() merchantId: string) {
    return this.locationsService.findAll(merchantId);
  }

  @Get(':id')
  async findOne(@MerchantId() merchantId: string, @Param('id') id: string) {
    return this.locationsService.findById(merchantId, id);
  }

  @Put(':id')
  async update(@MerchantId() merchantId: string, @Param('id') id: string, @Body() body: object) {
    return this.locationsService.update(merchantId, id, body as Parameters<LocationsService['update']>[2]);
  }

  @Post(':id/terminal/connection-token')
  async getConnectionToken(@MerchantId() merchantId: string, @Param('id') id: string) {
    return this.locationsService.getConnectionToken(merchantId, id);
  }
}
