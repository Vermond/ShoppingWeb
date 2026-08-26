import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import type { ProductRecord } from './products.repository';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly productsRepository: ProductsRepository) {}

  async findAll(): Promise<ProductRecord[]> {
    try {
      return await this.productsRepository.findAll();
    } catch (error) {
      this.logger.error(
        '상품 목록 조회에 실패했습니다.',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException(
        '상품 목록을 불러오지 못했습니다.',
      );
    }
  }
}
