import Decimal from 'decimal.js';
import {
  calculateChangeRate,
  serializeAdminDashboard,
} from './admin-dashboard.types';

describe('admin dashboard serialization', () => {
  it('calculates comparison rates and preserves decimal amounts', () => {
    expect(calculateChangeRate('125.00', '100.00')).toBe(25);
    expect(calculateChangeRate(0, 0)).toBe(0);
    expect(calculateChangeRate(10, 0)).toBeNull();

    const serialized = serializeAdminDashboard(
      {
        currentSummary: {
          revenue: '125.00',
          order_count: 3,
          new_customer_count: 1,
        },
        previousSummary: {
          revenue: '100.00',
          order_count: 2,
          new_customer_count: 0,
        },
        dailySales: [],
        categorySales: [
          {
            category_id: '1',
            category_name: 'Category',
            revenue: '125.00',
          },
        ],
        recentOrders: [
          {
            order_id: '22222222-2222-4222-8222-222222222222',
            customer_id: '11111111-1111-4111-8111-111111111111',
            customer_name: 'User',
            product_summary: [
              {
                product_id: '33333333-3333-4333-8333-333333333333',
                product_name: 'Product',
                quantity: 2,
              },
            ],
            product_count: 2,
            payment_amount: '125.00',
            status: 'paid',
            ordered_at: new Date('2026-08-30T00:00:00.000Z'),
          },
        ],
        inventory: [
          {
            product_id: '33333333-3333-4333-8333-333333333333',
            product_name: 'Product',
            category_id: '1',
            category_name: 'Category',
            stock: 10,
            period_sold_quantity: 2,
          },
        ],
      },
      {
        from: '2026-08-01',
        to: '2026-08-30',
        comparisonFrom: '2026-07-02',
        comparisonTo: '2026-07-31',
      },
      [
        {
          date: '2026-08-01',
          revenue: '125.00',
        },
      ],
    );

    expect(serialized.summary.revenue).toEqual({
      value: '125.00',
      change_rate_percent: 25,
    });
    expect(
      serialized.summary.new_customer_count.change_rate_percent,
    ).toBeNull();
    expect(serialized.category_sales[0]).toEqual({
      category_id: '1',
      category_name: 'Category',
      revenue: '125.00',
      sales_ratio_percent: 100,
    });
    expect(serialized.recent_orders[0]?.payment_amount).toBe('125.00');
    expect(serialized.inventory[0]?.low_stock).toBe(true);
  });

  it('returns zero ratios when there are no category sales', () => {
    const result = serializeAdminDashboard(
      {
        currentSummary: { revenue: '0', order_count: 0, new_customer_count: 0 },
        previousSummary: {
          revenue: '0',
          order_count: 0,
          new_customer_count: 0,
        },
        dailySales: [],
        categorySales: [
          { category_id: '1', category_name: 'Category', revenue: '0' },
        ],
        recentOrders: [],
        inventory: [],
      },
      {
        from: '2026-08-01',
        to: '2026-08-01',
        comparisonFrom: '2026-07-31',
        comparisonTo: '2026-07-31',
      },
      [],
    );

    expect(result.category_sales[0]?.sales_ratio_percent).toBe(0);
    expect(result.summary.revenue.value).toBe(new Decimal('0').toFixed(2));
  });
});
