import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { AddWishlistItemInput } from './wishlist.input';
import { WishlistRepository } from './wishlist.repository';
import {
  toWishlistItemRecord,
  type WishlistItemRecord,
} from './wishlist.types';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly wishlistRepository: WishlistRepository,
  ) {}

  async findAllByUserId(userId: string): Promise<WishlistItemRecord[]> {
    return this.withDatabaseError('찜 목록 조회에 실패했습니다.', async () => {
      const items = await this.wishlistRepository.findAllByUserId(userId);

      return items.map(toWishlistItemRecord);
    });
  }

  async addItem(
    userId: string,
    input: AddWishlistItemInput,
  ): Promise<WishlistItemRecord> {
    return this.withDatabaseError('찜 추가에 실패했습니다.', async () =>
      this.databaseService.transaction(async (executor) => {
        const product = await this.wishlistRepository.findProductById(
          input.product_id,
          executor,
        );

        if (!product) {
          throw new NotFoundException({
            code: 'PRODUCT_NOT_FOUND',
            message: '상품을 찾을 수 없습니다.',
          });
        }

        if (product.status !== 'active') {
          throw new ConflictException({
            code: 'PRODUCT_UNAVAILABLE',
            message: '현재 찜할 수 없는 상품입니다.',
          });
        }

        await this.wishlistRepository.insertItem(
          userId,
          input.product_id,
          executor,
        );

        const item = await this.wishlistRepository.findByUserIdAndProductId(
          userId,
          input.product_id,
          executor,
        );

        if (!item) {
          throw new Error('추가된 찜 항목을 조회하지 못했습니다.');
        }

        return toWishlistItemRecord(item);
      }),
    );
  }

  async removeItem(userId: string, productId: string): Promise<void> {
    return this.withDatabaseError('찜 삭제에 실패했습니다.', async () => {
      const deleted = await this.wishlistRepository.deleteItem(
        userId,
        productId,
      );

      if (!deleted) {
        throw new NotFoundException({
          code: 'WISHLIST_ITEM_NOT_FOUND',
          message: '찜한 상품을 찾을 수 없습니다.',
        });
      }
    });
  }

  private async withDatabaseError<T>(
    message: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        message,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('찜 목록을 처리하지 못했습니다.');
    }
  }
}
