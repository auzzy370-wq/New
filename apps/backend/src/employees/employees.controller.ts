import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantId } from '../common/decorators/merchant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/request.types';

@ApiTags('employees')
@Controller('employees')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  async create(@MerchantId() merchantId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: Parameters<EmployeesService['create']>[1]) {
    return this.employeesService.create(merchantId, body, user.id);
  }

  @Get()
  async findAll(@MerchantId() merchantId: string) {
    return this.employeesService.findAll(merchantId);
  }

  @Get(':id')
  async findOne(@MerchantId() merchantId: string, @Param('id') id: string) {
    return this.employeesService.findById(merchantId, id);
  }

  @Put(':id')
  async update(@MerchantId() merchantId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: Parameters<EmployeesService['update']>[2]) {
    return this.employeesService.update(merchantId, id, body, user.id);
  }

  @Post(':id/verify-pin')
  async verifyPin(@MerchantId() merchantId: string, @Param('id') id: string, @Body('pin') pin: string) {
    return { valid: await this.employeesService.validatePin(merchantId, id, pin) };
  }
}
