import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantId } from '../common/decorators/merchant.decorator';
import { InventoryMovementType } from '@prisma/client';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async getInventory(
    @MerchantId() merchantId: string,
    @Query('locationId') locationId?: string,
    @Query('productId') productId?: string,
  ) {
    return this.inventoryService.getInventory(merchantId, locationId, productId);
  }

  @Get('low-stock')
  async getLowStock(@MerchantId() merchantId: string) {
    return this.inventoryService.getLowStock(merchantId);
  }

  @Post('adjust')
  async adjust(
    @MerchantId() merchantId: string,
    @Body() body: {
      locationId: string;
      productId: string;
      variantId?: string;
      quantity: number;
      type: InventoryMovementType;
      notes?: string;
    },
  ) {
    return this.inventoryService.adjust(merchantId, body);
  }

  @Get('movements')
  async getMovements(
    @MerchantId() merchantId: string,
    @Query('inventoryId') inventoryId?: string,
    @Query('productId') productId?: string,
  ) {
    return this.inventoryService.getMovements(merchantId, inventoryId, productId);
  }
}
