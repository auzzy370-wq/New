import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantId } from '../common/decorators/merchant.decorator';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findAll(
    @MerchantId() merchantId: string,
    @Query('resource') resource?: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.findAll(merchantId, { resource, limit });
  }
}
