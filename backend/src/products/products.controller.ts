import { Controller, Get } from '@nestjs/common';
import { ProductsService } from './products.service';
import type { ProductRecord } from './products.repository';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(): Promise<{ products: ProductRecord[] }> {
    const products = await this.productsService.findAll();

    return { products };
  }
}
