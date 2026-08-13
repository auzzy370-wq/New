import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantGuard } from '../auth/guards/merchant.guard';
import { MerchantId } from '../common/decorators/merchant.decorator';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@ApiTags('locations')
@Controller('locations')
@UseGuards(JwtAuthGuard, MerchantGuard)
@ApiBearerAuth('JWT')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all locations for merchant' })
  async findAll(@MerchantId() merchantId: string) {
    return this.locationsService.findAll(merchantId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get locations summary' })
  async getSummary(@MerchantId() merchantId: string) {
    return this.locationsService.getSummary(merchantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new location' })
  async create(
    @MerchantId() merchantId: string,
    @Body() dto: CreateLocationDto,
  ) {
    return this.locationsService.create(merchantId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get location by ID' })
  async findOne(@MerchantId() merchantId: string, @Param('id') id: string) {
    return this.locationsService.findById(merchantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update location' })
  async update(
    @MerchantId() merchantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.update(merchantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete (soft) location' })
  async delete(@MerchantId() merchantId: string, @Param('id') id: string) {
    return this.locationsService.delete(merchantId, id);
  }

  @Put(':id/default')
  @ApiOperation({ summary: 'Set location as default' })
  async setDefault(@MerchantId() merchantId: string, @Param('id') id: string) {
    return this.locationsService.setDefault(merchantId, id);
  }

  @Post(':id/connection-token')
  @ApiOperation({ summary: 'Get Stripe Terminal connection token for location' })
  async getConnectionToken(
    @MerchantId() merchantId: string,
    @Param('id') id: string,
  ) {
    return this.locationsService.getConnectionToken(merchantId, id);
  }
}
