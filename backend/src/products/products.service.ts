import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { calculateProductPagination } from './products.pagination';
import type { ProductsQuery } from './products.input';
import {
  toProductDetailRecord,
  toProductRecord,
  type ProductDetailRecord,
  type ProductPage,
} from './products.types';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly productsRepository: ProductsRepository) {}

  async findPage(query: ProductsQuery): Promise<ProductPage> {
    try {
      const offset = (query.page - 1) * query.limit;
      const result = await this.productsRepository.findPage(
        query.limit,
        offset,
      );

      return {
        products: result.rows.map(toProductRecord),
        pagination: calculateProductPagination(query, result.totalItems),
      };
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

  async findById(id: string): Promise<ProductDetailRecord> {
    try {
      const product = await this.productsRepository.findById(id);

      if (!product) {
        throw new NotFoundException('상품을 찾을 수 없습니다.');
      }

      return toProductDetailRecord(product);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        '상품 상세 조회에 실패했습니다.',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException(
        '상품 정보를 불러오지 못했습니다.',
      );
    }
  }
}
