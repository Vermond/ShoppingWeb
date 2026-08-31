import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminProductCreateInput,
  AdminProductListQuery,
  AdminProductStockInput,
  AdminProductStatusInput,
  AdminProductUpdateInput,
} from './admin-products.input';
import {
  AdminProductCategoryNotFoundError,
  AdminProductNotFoundError,
  AdminProductsRepository,
} from './admin-products.repository';
import {
  createEmptyProductStatusCounts,
  toAdminProductDetailRecord,
  toAdminProductRecord,
  type AdminProductDetailRecord,
  type AdminProductPage,
} from './admin-products.types';

@Injectable()
export class AdminProductsService {
  private readonly logger = new Logger(AdminProductsService.name);

  constructor(
    private readonly adminProductsRepository: AdminProductsRepository,
  ) {}

  async findPage(query: AdminProductListQuery): Promise<AdminProductPage> {
    try {
      const result = await this.adminProductsRepository.findPage(query);

      return {
        products: result.rows.map(toAdminProductRecord),
        totalCount: result.totalCount,
        statusCounts: {
          ...createEmptyProductStatusCounts(),
          ...result.statusCounts,
        },
      };
    } catch (error) {
      throw this.handleError('관리자 상품 목록 조회에 실패했습니다.', error);
    }
  }

  async findOne(id: string): Promise<AdminProductDetailRecord> {
    try {
      const product = await this.adminProductsRepository.findById(id);

      if (!product) {
        throw new NotFoundException({
          code: 'PRODUCT_NOT_FOUND',
          message: '상품을 찾을 수 없습니다.',
        });
      }

      return toAdminProductDetailRecord(product);
    } catch (error) {
      throw this.handleError('관리자 상품 상세 조회에 실패했습니다.', error);
    }
  }

  async create(
    input: AdminProductCreateInput,
  ): Promise<AdminProductDetailRecord> {
    try {
      const product = await this.adminProductsRepository.create(input);
      return toAdminProductDetailRecord(product);
    } catch (error) {
      throw this.handleError('관리자 상품 생성에 실패했습니다.', error);
    }
  }

  async update(
    id: string,
    input: AdminProductUpdateInput,
  ): Promise<AdminProductDetailRecord> {
    try {
      const product = await this.adminProductsRepository.update(id, input);
      return toAdminProductDetailRecord(product);
    } catch (error) {
      throw this.handleError('관리자 상품 수정에 실패했습니다.', error);
    }
  }

  async updateStatus(
    id: string,
    input: AdminProductStatusInput,
  ): Promise<AdminProductDetailRecord> {
    return this.update(id, input);
  }

  async updateStock(
    id: string,
    input: AdminProductStockInput,
  ): Promise<AdminProductDetailRecord> {
    try {
      const product = await this.adminProductsRepository.updateStock(
        id,
        input.stock,
      );
      return toAdminProductDetailRecord(product);
    } catch (error) {
      throw this.handleError('관리자 상품 재고 수정에 실패했습니다.', error);
    }
  }

  private handleError(message: string, error: unknown): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    if (error instanceof AdminProductNotFoundError) {
      return new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: error.message,
      });
    }

    if (error instanceof AdminProductCategoryNotFoundError) {
      return new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: error.message,
      });
    }

    this.logger.error(
      message,
      error instanceof Error ? error.stack : String(error),
    );
    return new InternalServerErrorException('상품을 처리하지 못했습니다.');
  }
}
