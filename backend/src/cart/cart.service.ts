import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DatabaseService,
  type DatabaseQueryExecutor,
} from '../database/database.service';
import type { AddCartItemInput, UpdateCartItemInput } from './cart.input';
import { CartRepository } from './cart.repository';
import { toCartRecord, type CartRecord } from './cart.types';
import type { ProductRow } from '../products/products.types';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cartRepository: CartRepository,
  ) {}

  async findByUserId(userId: string): Promise<CartRecord> {
    return this.withDatabaseError('장바구니 조회에 실패했습니다.', async () =>
      this.databaseService.transaction(async (executor) => {
        await this.cartRepository.getOrCreateCartId(userId, executor);

        return this.readCart(userId, executor);
      }),
    );
  }

  async addItem(userId: string, input: AddCartItemInput): Promise<CartRecord> {
    return this.withDatabaseError(
      '장바구니 상품 추가에 실패했습니다.',
      async () =>
        this.databaseService.transaction(async (executor) => {
          const cartId = await this.cartRepository.getOrCreateCartId(
            userId,
            executor,
          );
          const product = await this.cartRepository.findProductByIdForUpdate(
            input.product_id,
            executor,
          );

          assertProductCanBePurchased(product);

          const existingItem = await this.cartRepository.findItemForUpdate(
            cartId,
            input.product_id,
            executor,
          );
          const nextQuantity = (existingItem?.quantity ?? 0) + input.quantity;

          assertQuantityCanBePurchased(product, nextQuantity);

          if (existingItem) {
            await this.cartRepository.updateItem(
              existingItem.id,
              nextQuantity,
              executor,
            );
          } else {
            await this.cartRepository.insertItem(
              cartId,
              input.product_id,
              input.quantity,
              executor,
            );
          }

          await this.cartRepository.touchCart(cartId, executor);

          return this.readCart(userId, executor);
        }),
    );
  }

  async updateItem(
    userId: string,
    productId: string,
    input: UpdateCartItemInput,
  ): Promise<CartRecord> {
    return this.withDatabaseError(
      '장바구니 상품 수량 수정에 실패했습니다.',
      async () =>
        this.databaseService.transaction(async (executor) => {
          const cartId = await this.getCartId(userId, executor);
          const product = await this.cartRepository.findProductByIdForUpdate(
            productId,
            executor,
          );
          assertProductCanBePurchased(product);

          const item = await this.cartRepository.findItemForUpdate(
            cartId,
            productId,
            executor,
          );

          if (!item) {
            throw new NotFoundException({
              code: 'CART_ITEM_NOT_FOUND',
              message: '장바구니 상품을 찾을 수 없습니다.',
            });
          }

          assertQuantityCanBePurchased(product, input.quantity);
          await this.cartRepository.updateItem(
            item.id,
            input.quantity,
            executor,
          );
          await this.cartRepository.touchCart(cartId, executor);

          return this.readCart(userId, executor);
        }),
    );
  }

  async removeItem(userId: string, productId: string): Promise<CartRecord> {
    return this.withDatabaseError(
      '장바구니 상품 삭제에 실패했습니다.',
      async () =>
        this.databaseService.transaction(async (executor) => {
          const cartId = await this.getCartId(userId, executor);
          const deleted = await this.cartRepository.deleteItem(
            cartId,
            productId,
            executor,
          );

          if (!deleted) {
            throw new NotFoundException({
              code: 'CART_ITEM_NOT_FOUND',
              message: '장바구니 상품을 찾을 수 없습니다.',
            });
          }

          await this.cartRepository.touchCart(cartId, executor);

          return this.readCart(userId, executor);
        }),
    );
  }

  private async getCartId(
    userId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<string> {
    const cartId = await this.cartRepository.findCartIdByUserId(
      userId,
      executor,
    );

    if (!cartId) {
      throw new NotFoundException({
        code: 'CART_ITEM_NOT_FOUND',
        message: '장바구니 상품을 찾을 수 없습니다.',
      });
    }

    return cartId;
  }

  private async readCart(
    userId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<CartRecord> {
    const cart = await this.cartRepository.findByUserId(userId, executor);

    if (!cart) {
      throw new Error('사용자 장바구니를 조회하지 못했습니다.');
    }

    return toCartRecord(cart);
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
      throw new InternalServerErrorException('장바구니를 처리하지 못했습니다.');
    }
  }
}

function assertProductCanBePurchased(
  product: ProductRow | null,
): asserts product is ProductRow {
  if (!product) {
    throw new NotFoundException({
      code: 'PRODUCT_NOT_FOUND',
      message: '상품을 찾을 수 없습니다.',
    });
  }

  if (product.status !== 'active') {
    throw new ConflictException({
      code: 'PRODUCT_UNAVAILABLE',
      message: '현재 구매할 수 없는 상품입니다.',
    });
  }
}

function assertQuantityCanBePurchased(
  product: ProductRow,
  quantity: number,
): void {
  if (quantity > product.max_order_quantity) {
    throw new ConflictException({
      code: 'MAX_ORDER_QUANTITY_EXCEEDED',
      message: '한 번에 구매 가능한 최대 수량을 초과했습니다.',
    });
  }

  if (quantity > product.stock) {
    throw new ConflictException({
      code: 'INSUFFICIENT_STOCK',
      message: '현재 재고보다 많은 수량을 담을 수 없습니다.',
    });
  }
}
