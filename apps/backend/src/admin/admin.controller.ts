import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOnly } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { MerchantStatus } from '@prisma/client';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AdminOnly()
@ApiBearerAuth('JWT')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('merchants')
  async getMerchants(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: MerchantStatus,
  ) {
    return this.adminService.getMerchants({ page, limit, search, status });
  }

  @Post('merchants/:id/suspend')
  async suspendMerchant(@Param('id') id: string, @Body('reason') reason: string) {
    return this.adminService.suspendMerchant(id, reason);
  }

  @Post('merchants/:id/activate')
  async activateMerchant(@Param('id') id: string) {
    return this.adminService.activateMerchant(id);
  }

  @Get('webhooks/stats')
  async getWebhookStats() {
    return this.adminService.getWebhookStats();
  }

  @Get('revenue')
  async getPlatformRevenue(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();
    return this.adminService.getPlatformRevenue({ startDate: start, endDate: end });
  }
}
