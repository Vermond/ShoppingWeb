import {
  calculateReportChangeRate,
  serializeAdminReport,
} from './admin-reports.types';

describe('admin reports types', () => {
  it('keeps money as fixed decimal strings and calculates category ratios', () => {
    const result = serializeAdminReport(
      {
        currentSummary: {
          revenue: '123.456',
          order_count: 2,
          average_order_amount: '61.728',
          new_customer_count: 1,
          repurchase_rate_percent: '25.555',
        },
        previousSummary: {
          revenue: '100.00',
          order_count: 1,
          average_order_amount: '100.00',
          new_customer_count: 1,
          repurchase_rate_percent: '20.00',
        },
        dailySales: [],
        categorySales: [
          {
            category_id: '1',
            category_name: '리빙',
            revenue: '123.456',
            sales_quantity: 3,
          },
        ],
        topProducts: [],
      },
      {
        from: '2026-08-01',
        to: '2026-08-01',
        comparisonFrom: '2026-07-31',
        comparisonTo: '2026-07-31',
      },
      [],
    );

    expect(result.summary.revenue.value).toBe('123.46');
    expect(result.summary.average_order_amount.value).toBe('61.73');
    expect(result.summary.repurchase_rate_percent.value).toBe(25.56);
    expect(result.category_sales[0]?.sales_ratio_percent).toBe(100);
  });

  it('returns null when a comparison rate cannot be calculated', () => {
    expect(calculateReportChangeRate('10.00', '0.00')).toBeNull();
    expect(calculateReportChangeRate('0.00', '0.00')).toBeNull();
    expect(calculateReportChangeRate('120.00', '100.00')).toBe(20);
  });
});
