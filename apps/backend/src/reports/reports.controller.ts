import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantId } from '../common/decorators/merchant.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  async getDashboard(@MerchantId() merchantId: string) {
    return this.reportsService.getDashboardMetrics(merchantId);
  }

  @Get('sales')
  async getSales(
    @MerchantId() merchantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('locationId') locationId?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();
    return this.reportsService.getSalesReport(merchantId, { startDate: start, endDate: end, locationId });
  }

  @Get('revenue')
  async getRevenue(
    @MerchantId() merchantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();
    return this.reportsService.getRevenueReport(merchantId, { startDate: start, endDate: end });
  }
}
