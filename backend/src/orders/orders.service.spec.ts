import { ConflictException, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import type { DatabaseService } from '../database/database.service';
import { MockPaymentService } from './mock-payment.service';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import type { OrderRow } from './orders.types';

const order: OrderRow = {
  id: '11111111-1111-4111-8111-111111111111',
  user_id: '22222222-2222-4222-8222-222222222222',
  status: 'paid',
  subtotal: '25800.00',
  shipping_fee: '3000.00',
  discount_amount: '0.00',
  total_amount: '28800.00',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
  items: [
    {
      id: '1',
      order_id: '11111111-1111-4111-8111-111111111111',
      product_id: '33333333-3333-4333-8333-333333333333',
      product_name: '상품 A',
      unit_price: '12900.00',
      quantity: 2,
    },
  ],
  address: {
    order_id: '11111111-1111-4111-8111-111111111111',
    recipient_name: '홍길동',
    phone_number: '01012345678',
    postal_code: '06236',
    address_line1: '주소',
    address_line2: null,
    delivery_request: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
  },
};

function createService() {
  const transaction = jest.fn((callback) => callback({ query: jest.fn() }));
  const databaseService = { transaction } as unknown as DatabaseService;
  const repository = {
    findCheckoutCart: jest.fn(),
    findAddressForOrder: jest.fn(),
    findActiveShippingPolicy: jest.fn(),
    createOrder: jest.fn(),
    insertOrderItem: jest.fn(),
    decrementStock: jest.fn(),
    insertOrderAddress: jest.fn(),
    clearCart: jest.fn(),
    findById: jest.fn(),
    findAllByUserId: jest.fn(),
    findHeaderForUpdate: jest.fn(),
    findItemsForCancellation: jest.fn(),
    restoreStock: jest.fn(),
    cancelOrder: jest.fn(),
  } as unknown as jest.Mocked<OrdersRepository>;
  const payment = new MockPaymentService();
  const service = new OrdersService(databaseService, repository, payment);

  return { service, repository, transaction };
}

describe('OrdersService', () => {
  it('creates a paid order, decrements stock, snapshots the address, and clears the cart', async () => {
    const { service, repository } = createService();
    repository.findCheckoutCart.mockResolvedValue({
      cart_id: 'cart-1',
      items: [
        {
          cart_id: 'cart-1',
          product_id: 'product-1',
          quantity: 2,
          product_name: '상품 A',
          product_price: '12900.00',
          product_stock: 5,
          product_max_order_quantity: 3,
          product_status: 'active',
        },
      ],
    });
    repository.findAddressForOrder.mockResolvedValue({
      order_id: '',
      recipient_name: '홍길동',
      phone_number: '01012345678',
      postal_code: '06236',
      address_line1: '주소',
      address_line2: null,
      delivery_request: null,
      created_at: new Date(),
    });
    repository.findActiveShippingPolicy.mockResolvedValue({
      id: '1',
      base_fee: '3000.00',
      free_threshold: '50000.00',
    });
    repository.createOrder.mockResolvedValue({
      id: order.id,
      user_id: order.user_id,
      status: 'paid',
      subtotal: '25800.00',
      shipping_fee: '3000.00',
      discount_amount: '0.00',
      total_amount: '28800.00',
      created_at: order.created_at,
      updated_at: order.updated_at,
    });
    repository.decrementStock.mockResolvedValue(true);
    repository.findById.mockResolvedValue(order);

    const result = await service.create(order.user_id, {
      address_id: 'address-1',
      delivery_request: '문 앞에 놓아주세요',
    });

    expect(result.total_amount).toEqual(new Decimal('28800.00'));
    expect(repository.createOrder).toHaveBeenCalledWith(
      order.user_id,
      'paid',
      {
        subtotal: '25800.00',
        shipping_fee: '3000.00',
        discount_amount: '0.00',
        total_amount: '28800.00',
      },
      expect.anything(),
    );
    expect(repository.decrementStock).toHaveBeenCalledWith(
      'product-1',
      2,
      expect.anything(),
    );
    expect(repository.insertOrderAddress).toHaveBeenCalledWith(
      order.id,
      expect.objectContaining({ delivery_request: '문 앞에 놓아주세요' }),
      '문 앞에 놓아주세요',
      expect.anything(),
    );
    expect(repository.clearCart).toHaveBeenCalledWith(
      'cart-1',
      expect.anything(),
    );
  });

  it('rejects an empty cart and does not invoke payment or order creation', async () => {
    const { service, repository } = createService();
    repository.findCheckoutCart.mockResolvedValue({
      cart_id: 'cart-1',
      items: [],
    });

    await expect(
      service.create(order.user_id, {
        address_id: 'address-1',
        delivery_request: null,
      }),
    ).rejects.toMatchObject({
      response: { code: 'CART_EMPTY' },
    });
    expect(repository.createOrder).not.toHaveBeenCalled();
  });

  it('cancels a paid order and restores stock', async () => {
    const { service, repository } = createService();
    repository.findHeaderForUpdate.mockResolvedValue({
      id: order.id,
      user_id: order.user_id,
      status: 'paid',
      subtotal: order.subtotal,
      shipping_fee: order.shipping_fee,
      discount_amount: order.discount_amount,
      total_amount: order.total_amount,
      created_at: order.created_at,
      updated_at: order.updated_at,
    });
    repository.findItemsForCancellation.mockResolvedValue([
      { product_id: 'product-1', quantity: 2 },
    ]);
    repository.cancelOrder.mockResolvedValue({
      id: order.id,
      user_id: order.user_id,
      status: 'cancelled',
      subtotal: order.subtotal,
      shipping_fee: order.shipping_fee,
      discount_amount: order.discount_amount,
      total_amount: order.total_amount,
      created_at: order.created_at,
      updated_at: order.updated_at,
    });
    repository.findById.mockResolvedValue({ ...order, status: 'cancelled' });

    const result = await service.cancel(order.user_id, order.id);

    expect(result.status).toBe('cancelled');
    expect(repository.restoreStock).toHaveBeenCalledWith(
      'product-1',
      2,
      expect.anything(),
    );
    expect(repository.cancelOrder).toHaveBeenCalledWith(
      order.user_id,
      order.id,
      expect.anything(),
    );
  });

  it('rejects cancellation after shipment', async () => {
    const { service, repository } = createService();
    repository.findHeaderForUpdate.mockResolvedValue({
      id: order.id,
      user_id: order.user_id,
      status: 'shipped',
      subtotal: order.subtotal,
      shipping_fee: order.shipping_fee,
      discount_amount: order.discount_amount,
      total_amount: order.total_amount,
      created_at: order.created_at,
      updated_at: order.updated_at,
    });

    await expect(
      service.cancel(order.user_id, order.id),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns a not found error when the selected address is not owned by the user', async () => {
    const { service, repository } = createService();
    repository.findCheckoutCart.mockResolvedValue({
      cart_id: 'cart-1',
      items: [
        {
          cart_id: 'cart-1',
          product_id: 'product-1',
          quantity: 1,
          product_name: '상품 A',
          product_price: '100.00',
          product_stock: 1,
          product_max_order_quantity: 1,
          product_status: 'active',
        },
      ],
    });
    repository.findAddressForOrder.mockResolvedValue(null);

    await expect(
      service.create(order.user_id, {
        address_id: 'address-1',
        delivery_request: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an unavailable product before creating the order', async () => {
    const { service, repository } = createService();
    repository.findCheckoutCart.mockResolvedValue({
      cart_id: 'cart-1',
      items: [
        {
          cart_id: 'cart-1',
          product_id: 'product-1',
          quantity: 1,
          product_name: '상품 A',
          product_price: '100.00',
          product_stock: 1,
          product_max_order_quantity: 1,
          product_status: 'inactive',
        },
      ],
    });

    await expect(
      service.create(order.user_id, {
        address_id: 'address-1',
        delivery_request: null,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.findAddressForOrder).not.toHaveBeenCalled();
  });

  it('rejects order creation when no shipping policy is active', async () => {
    const { service, repository } = createService();
    repository.findCheckoutCart.mockResolvedValue({
      cart_id: 'cart-1',
      items: [
        {
          cart_id: 'cart-1',
          product_id: 'product-1',
          quantity: 1,
          product_name: '상품 A',
          product_price: '100.00',
          product_stock: 1,
          product_max_order_quantity: 1,
          product_status: 'active',
        },
      ],
    });
    repository.findAddressForOrder.mockResolvedValue({
      order_id: '',
      recipient_name: '홍길동',
      phone_number: '01012345678',
      postal_code: '06236',
      address_line1: '주소',
      address_line2: null,
      delivery_request: null,
      created_at: new Date(),
    });
    repository.findActiveShippingPolicy.mockResolvedValue(null);

    await expect(
      service.create(order.user_id, {
        address_id: 'address-1',
        delivery_request: null,
      }),
    ).rejects.toMatchObject({
      response: { code: 'SHIPPING_POLICY_UNAVAILABLE' },
    });
    expect(repository.createOrder).not.toHaveBeenCalled();
  });
});
