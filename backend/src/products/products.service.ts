import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { toProductRecord, type ProductRecord } from './products.types';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly productsRepository: ProductsRepository) {}

  async findAll(): Promise<ProductRecord[]> {
    try {
      const products = await this.productsRepository.findAll();

      return products.map(toProductRecord);
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
