import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantId } from '../common/decorators/merchant.decorator';

@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(@MerchantId() merchantId: string, @Body() body: Parameters<ProductsService['create']>[1]) {
    return this.productsService.create(merchantId, body);
  }

  @Get()
  async findAll(
    @MerchantId() merchantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.productsService.findAll(merchantId, { page, limit, categoryId, search, isActive });
  }

  @Get('categories')
  async getCategories(@MerchantId() merchantId: string) {
    return this.productsService.getCategories(merchantId);
  }

  @Post('categories')
  async createCategory(@MerchantId() merchantId: string, @Body() body: { name: string; description?: string; color?: string }) {
    return this.productsService.createCategory(merchantId, body);
  }

  @Get(':id')
  async findOne(@MerchantId() merchantId: string, @Param('id') id: string) {
    return this.productsService.findById(merchantId, id);
  }

  @Put(':id')
  async update(@MerchantId() merchantId: string, @Param('id') id: string, @Body() body: object) {
    return this.productsService.update(merchantId, id, body as Parameters<ProductsService['update']>[2]);
  }

  @Delete(':id')
  async delete(@MerchantId() merchantId: string, @Param('id') id: string) {
    return this.productsService.delete(merchantId, id);
  }
}
