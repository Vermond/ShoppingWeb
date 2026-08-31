import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import type { CategoryRecord } from './categories.types';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async findAll(): Promise<CategoryRecord[]> {
    try {
      return await this.categoriesRepository.findAll();
    } catch (error) {
      this.logger.error(
        '카테고리 목록 조회에 실패했습니다.',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException(
        '카테고리 목록을 불러오지 못했습니다.',
      );
    }
  }
}
