import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { serializeProduct, type ProductResponse } from './products.types';
import { ProductsResponseDto } from '../swagger/swagger.schemas';

@Controller('api/products')
@ApiTags('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: '상품 목록 조회' })
  @ApiOkResponse({ type: ProductsResponseDto })
  async findAll(): Promise<{ products: ProductResponse[] }> {
    const products = await this.productsService.findAll();

    return { products: products.map(serializeProduct) };
  }
}
