import { OrdersRepository } from './orders.repository';
import type { DatabaseService } from '../database/database.service';

describe('OrdersRepository', () => {
  it('loads a checkout cart with explicit product columns', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 'cart-1' }] })
      .mockResolvedValueOnce({
        rows: [
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
    const executor = { query };
    const repository = new OrdersRepository({} as DatabaseService);

    await expect(
      repository.findCheckoutCart('user-1', executor),
    ).resolves.toEqual({
      cart_id: 'cart-1',
      items: [
        expect.objectContaining({
          product_id: 'product-1',
          product_price: '12900.00',
        }),
      ],
    });
    expect(query.mock.calls[1]?.[0]).toContain(
      'p.max_order_quantity AS product_max_order_quantity',
    );
    expect(query.mock.calls[1]?.[0]).toContain('FOR UPDATE OF ci, p');
  });

  it('builds a detailed order from header, items, and address rows', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'order-1',
            user_id: 'user-1',
            status: 'paid',
            total_amount: '12900.00',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            order_id: 'order-1',
            recipient_name: '홍길동',
            phone_number: '01012345678',
            postal_code: '06236',
            address_line1: '주소',
            address_line2: null,
            delivery_request: null,
            created_at: new Date(),
          },
        ],
      });
    const repository = new OrdersRepository({} as DatabaseService);

    await expect(
      repository.findById('user-1', 'order-1', { query }),
    ).resolves.toMatchObject({
      id: 'order-1',
      address: { order_id: 'order-1' },
    });
  });

  it('returns false when a stock update affects no product row', async () => {
    const repository = new OrdersRepository({} as DatabaseService);
    const executor = {
      query: jest.fn().mockResolvedValue({ rowCount: 0, rows: [] }),
    };

    await expect(
      repository.decrementStock('product-1', 2, executor),
    ).resolves.toBe(false);
  });
});
