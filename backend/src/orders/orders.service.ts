import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { DatabaseService } from '../database/database.service';
import type { CreateOrderInput } from './orders.input';
import { MockPaymentService } from './mock-payment.service';
import { OrdersRepository } from './orders.repository';
import {
  toOrderRecord,
  toOrderSummaryRecord,
  type CheckoutCartItemRow,
  type OrderAddressRow,
  type OrderAmountRecord,
  type OrderRecord,
  type OrderSummaryRecord,
} from './orders.types';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly ordersRepository: OrdersRepository,
    private readonly mockPaymentService: MockPaymentService,
  ) {}

  async create(userId: string, input: CreateOrderInput): Promise<OrderRecord> {
    return this.withDatabaseError('주문 생성에 실패했습니다.', async () =>
      this.databaseService.transaction(async (executor) => {
        const cart = await this.ordersRepository.findCheckoutCart(
          userId,
          executor,
        );

        if (!cart || cart.items.length === 0) {
          throw new ConflictException({
            code: 'CART_EMPTY',
            message: '장바구니에 주문할 상품이 없습니다.',
          });
        }

        const subtotal = calculateOrderSubtotal(cart.items);
        const address = await this.ordersRepository.findAddressForOrder(
          userId,
          input.address_id,
          executor,
        );

        if (!address) {
          throw new NotFoundException({
            code: 'ADDRESS_NOT_FOUND',
            message: '배송지를 찾을 수 없습니다.',
          });
        }

        const shippingPolicy =
          await this.ordersRepository.findActiveShippingPolicy(executor);

        if (!shippingPolicy) {
          throw new ServiceUnavailableException({
            code: 'SHIPPING_POLICY_UNAVAILABLE',
            message: '배송 정책을 확인할 수 없어 주문할 수 없습니다.',
          });
        }

        const amounts = calculateOrderAmounts(
          subtotal,
          shippingPolicy.base_fee,
          shippingPolicy.free_threshold,
        );
        const payment = this.mockPaymentService.authorize(amounts.total_amount);

        if (!payment.approved) {
          throw new ConflictException({
            code: 'PAYMENT_FAILED',
            message: '결제에 실패했습니다.',
          });
        }

        const order = await this.ordersRepository.createOrder(
          userId,
          'paid',
          {
            subtotal: amounts.subtotal.toFixed(2),
            shipping_fee: amounts.shipping_fee.toFixed(2),
            discount_amount: amounts.discount_amount.toFixed(2),
            total_amount: amounts.total_amount.toFixed(2),
          },
          executor,
        );

        for (const item of cart.items) {
          await this.ordersRepository.insertOrderItem(order.id, item, executor);

          const stockUpdated = await this.ordersRepository.decrementStock(
            item.product_id,
            item.quantity,
            executor,
          );

          if (!stockUpdated) {
            throw new ConflictException({
              code: 'INSUFFICIENT_STOCK',
              message: '주문 처리 중 재고가 부족해졌습니다.',
            });
          }
        }

        const orderAddress: OrderAddressRow = {
          ...address,
          order_id: order.id,
          delivery_request: input.delivery_request,
        };

        await this.ordersRepository.insertOrderAddress(
          order.id,
          orderAddress,
          input.delivery_request,
          executor,
        );
        await this.ordersRepository.clearCart(cart.cart_id, executor);

        const createdOrder = await this.ordersRepository.findById(
          userId,
          order.id,
          executor,
        );

        if (!createdOrder) {
          throw new Error('생성된 주문을 조회하지 못했습니다.');
        }

        return toOrderRecord(createdOrder);
      }),
    );
  }

  async preview(userId: string): Promise<OrderAmountRecord> {
    return this.withDatabaseError(
      '주문 금액 미리보기에 실패했습니다.',
      async () =>
        this.databaseService.transaction(async (executor) => {
          const cart = await this.ordersRepository.findCheckoutCart(
            userId,
            executor,
          );

          if (!cart || cart.items.length === 0) {
            throw new ConflictException({
              code: 'CART_EMPTY',
              message: '장바구니에 주문할 상품이 없습니다.',
            });
          }

          const subtotal = calculateOrderSubtotal(cart.items);
          const shippingPolicy =
            await this.ordersRepository.findActiveShippingPolicy(executor);

          if (!shippingPolicy) {
            throw new ServiceUnavailableException({
              code: 'SHIPPING_POLICY_UNAVAILABLE',
              message: '배송 정책을 확인할 수 없어 주문할 수 없습니다.',
            });
          }

          return calculateOrderAmounts(
            subtotal,
            shippingPolicy.base_fee,
            shippingPolicy.free_threshold,
          );
        }),
    );
  }

  async findAll(userId: string): Promise<OrderSummaryRecord[]> {
    return this.withDatabaseError(
      '주문 목록 조회에 실패했습니다.',
      async () => {
        const orders = await this.ordersRepository.findAllByUserId(userId);

        return orders.map(toOrderSummaryRecord);
      },
    );
  }

  async findOne(userId: string, orderId: string): Promise<OrderRecord> {
    return this.withDatabaseError(
      '주문 상세 조회에 실패했습니다.',
      async () => {
        const order = await this.ordersRepository.findById(userId, orderId);

        if (!order) {
          throw new NotFoundException({
            code: 'ORDER_NOT_FOUND',
            message: '주문을 찾을 수 없습니다.',
          });
        }

        return toOrderRecord(order);
      },
    );
  }

  async cancel(userId: string, orderId: string): Promise<OrderRecord> {
    return this.withDatabaseError('주문 취소에 실패했습니다.', async () =>
      this.databaseService.transaction(async (executor) => {
        const order = await this.ordersRepository.findHeaderForUpdate(
          userId,
          orderId,
          executor,
        );

        if (!order) {
          throw new NotFoundException({
            code: 'ORDER_NOT_FOUND',
            message: '주문을 찾을 수 없습니다.',
          });
        }

        if (order.status === 'cancelled') {
          const cancelledOrder = await this.ordersRepository.findById(
            userId,
            orderId,
            executor,
          );

          if (!cancelledOrder) {
            throw new Error('취소된 주문을 조회하지 못했습니다.');
          }

          return toOrderRecord(cancelledOrder);
        }

        if (order.status !== 'paid') {
          throw new ConflictException({
            code: 'ORDER_CANNOT_BE_CANCELLED',
            message: '현재 주문 상태에서는 취소할 수 없습니다.',
          });
        }

        const items = await this.ordersRepository.findItemsForCancellation(
          orderId,
          executor,
        );

        for (const item of items) {
          await this.ordersRepository.restoreStock(
            item.product_id,
            item.quantity,
            executor,
          );
        }

        const cancelled = await this.ordersRepository.cancelOrder(
          userId,
          orderId,
          executor,
        );

        if (!cancelled) {
          throw new ConflictException({
            code: 'ORDER_CANNOT_BE_CANCELLED',
            message: '현재 주문 상태에서는 취소할 수 없습니다.',
          });
        }

        const cancelledOrder = await this.ordersRepository.findById(
          userId,
          orderId,
          executor,
        );

        if (!cancelledOrder) {
          throw new Error('취소된 주문을 조회하지 못했습니다.');
        }

        return toOrderRecord(cancelledOrder);
      }),
    );
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
      throw new InternalServerErrorException('주문을 처리하지 못했습니다.');
    }
  }
}

function calculateOrderSubtotal(items: CheckoutCartItemRow[]): Decimal {
  return items.reduce((total, item) => {
    assertItemCanBeOrdered(item);

    return total.add(new Decimal(item.product_price).mul(item.quantity));
  }, new Decimal(0));
}

function calculateShippingFee(
  subtotal: Decimal,
  baseFee: string,
  freeThreshold: string,
): Decimal {
  if (subtotal.gte(new Decimal(freeThreshold))) {
    return new Decimal(0);
  }

  return new Decimal(baseFee);
}

function calculateOrderAmounts(
  subtotal: Decimal,
  baseFee: string,
  freeThreshold: string,
): OrderAmountRecord {
  const shippingFee = calculateShippingFee(subtotal, baseFee, freeThreshold);
  const discountAmount = new Decimal(0);

  return {
    subtotal,
    shipping_fee: shippingFee,
    discount_amount: discountAmount,
    total_amount: subtotal.add(shippingFee).sub(discountAmount),
  };
}

function assertItemCanBeOrdered(item: CheckoutCartItemRow): void {
  if (item.product_status !== 'active') {
    throw new ConflictException({
      code: 'PRODUCT_UNAVAILABLE',
      message: '현재 구매할 수 없는 상품이 포함되어 있습니다.',
    });
  }

  if (item.quantity > item.product_max_order_quantity) {
    throw new ConflictException({
      code: 'MAX_ORDER_QUANTITY_EXCEEDED',
      message: '한 번에 구매 가능한 최대 수량을 초과했습니다.',
    });
  }

  if (item.quantity > item.product_stock) {
    throw new ConflictException({
      code: 'INSUFFICIENT_STOCK',
      message: '현재 재고보다 많은 수량을 주문할 수 없습니다.',
    });
  }
}
