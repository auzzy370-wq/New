import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RegistersService } from './registers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantId } from '../common/decorators/merchant.decorator';

@ApiTags('registers')
@Controller('registers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class RegistersController {
  constructor(private readonly registersService: RegistersService) {}

  @Post('open')
  async open(@MerchantId() merchantId: string, @Body() body: Parameters<RegistersService['openSession']>[1]) {
    return this.registersService.openSession(merchantId, body);
  }

  @Post(':id/close')
  async close(@MerchantId() merchantId: string, @Param('id') id: string, @Body() body: Parameters<RegistersService['closeSession']>[2]) {
    return this.registersService.closeSession(merchantId, id, body);
  }

  @Get('current')
  async getCurrent(@MerchantId() merchantId: string, @Query('locationId') locationId: string) {
    return this.registersService.getCurrentSession(merchantId, locationId);
  }

  @Get()
  async getSessions(@MerchantId() merchantId: string, @Query('locationId') locationId?: string) {
    return this.registersService.getSessions(merchantId, locationId);
  }
}
