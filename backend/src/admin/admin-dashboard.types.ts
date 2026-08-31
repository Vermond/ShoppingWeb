import Decimal from 'decimal.js';
import type { OrderStatus } from '../orders/orders.types';

export type AdminDashboardSummaryRow = {
  revenue: string;
  order_count: number;
  new_customer_count: number;
};

export type AdminDashboardDailySalesRow = {
  date: string;
  revenue: string;
};

export type AdminDashboardCategorySalesRow = {
  category_id: string;
  category_name: string;
  revenue: string;
};

export type AdminDashboardRecentOrderProductRow = {
  product_id: string;
  product_name: string;
  quantity: number;
};

export type AdminDashboardRecentOrderRow = {
  order_id: string;
  customer_id: string;
  customer_name: string;
  product_summary: AdminDashboardRecentOrderProductRow[];
  product_count: number;
  payment_amount: string;
  status: string;
  ordered_at: Date;
};

export type AdminDashboardInventoryRow = {
  product_id: string;
  product_name: string;
  category_id: string;
  category_name: string;
  stock: number;
  period_sold_quantity: number;
};

export type AdminDashboardRepositoryResult = {
  currentSummary: AdminDashboardSummaryRow;
  previousSummary: AdminDashboardSummaryRow;
  dailySales: AdminDashboardDailySalesRow[];
  categorySales: AdminDashboardCategorySalesRow[];
  recentOrders: AdminDashboardRecentOrderRow[];
  inventory: AdminDashboardInventoryRow[];
};

export type AdminDashboardMetric<T> = {
  value: T;
  change_rate_percent: number | null;
};

export type AdminDashboardResponse = {
  period: {
    from: string;
    to: string;
  };
  comparison_period: {
    from: string;
    to: string;
  };
  summary: {
    revenue: AdminDashboardMetric<string>;
    order_count: AdminDashboardMetric<number>;
    new_customer_count: AdminDashboardMetric<number>;
  };
  daily_sales: Array<{
    date: string;
    revenue: string;
  }>;
  category_sales: Array<{
    category_id: string;
    category_name: string;
    revenue: string;
    sales_ratio_percent: number;
  }>;
  recent_orders: Array<{
    order_id: string;
    customer_id: string;
    customer_name: string;
    product_summary: AdminDashboardRecentOrderProductRow[];
    product_count: number;
    payment_amount: string;
    status: OrderStatus;
    ordered_at: string;
  }>;
  inventory: Array<{
    product_id: string;
    product_name: string;
    category_id: string;
    category_name: string;
    stock: number;
    low_stock: boolean;
    period_sold_quantity: number;
  }>;
};

export function serializeAdminDashboard(
  result: AdminDashboardRepositoryResult,
  period: {
    from: string;
    to: string;
    comparisonFrom: string;
    comparisonTo: string;
  },
  dailySales: AdminDashboardDailySalesRow[],
): AdminDashboardResponse {
  const categoryTotal = result.categorySales.reduce(
    (total, category) => total.add(new Decimal(category.revenue)),
    new Decimal(0),
  );

  return {
    period: {
      from: period.from,
      to: period.to,
    },
    comparison_period: {
      from: period.comparisonFrom,
      to: period.comparisonTo,
    },
    summary: {
      revenue: {
        value: new Decimal(result.currentSummary.revenue).toFixed(2),
        change_rate_percent: calculateChangeRate(
          result.currentSummary.revenue,
          result.previousSummary.revenue,
        ),
      },
      order_count: {
        value: result.currentSummary.order_count,
        change_rate_percent: calculateChangeRate(
          result.currentSummary.order_count,
          result.previousSummary.order_count,
        ),
      },
      new_customer_count: {
        value: result.currentSummary.new_customer_count,
        change_rate_percent: calculateChangeRate(
          result.currentSummary.new_customer_count,
          result.previousSummary.new_customer_count,
        ),
      },
    },
    daily_sales: dailySales.map((row) => ({
      date: row.date,
      revenue: new Decimal(row.revenue).toFixed(2),
    })),
    category_sales: result.categorySales.map((category) => ({
      category_id: category.category_id,
      category_name: category.category_name,
      revenue: new Decimal(category.revenue).toFixed(2),
      sales_ratio_percent: calculateRatio(category.revenue, categoryTotal),
    })),
    recent_orders: result.recentOrders.map((order) => ({
      order_id: order.order_id,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      product_summary: order.product_summary,
      product_count: order.product_count,
      payment_amount: new Decimal(order.payment_amount).toFixed(2),
      status: toOrderStatus(order.status),
      ordered_at: order.ordered_at.toISOString(),
    })),
    inventory: result.inventory.map((product) => ({
      product_id: product.product_id,
      product_name: product.product_name,
      category_id: product.category_id,
      category_name: product.category_name,
      stock: product.stock,
      low_stock: product.stock <= 10,
      period_sold_quantity: product.period_sold_quantity,
    })),
  };
}

export function calculateChangeRate(
  current: Decimal.Value,
  previous: Decimal.Value,
): number | null {
  const currentValue = new Decimal(current);
  const previousValue = new Decimal(previous);

  if (previousValue.isZero()) {
    return currentValue.isZero() ? 0 : null;
  }

  return Number(
    currentValue
      .sub(previousValue)
      .div(previousValue)
      .mul(100)
      .toDecimalPlaces(2)
      .toFixed(2),
  );
}

function calculateRatio(value: string, total: Decimal): number {
  if (total.isZero()) {
    return 0;
  }

  return Number(
    new Decimal(value).div(total).mul(100).toDecimalPlaces(2).toFixed(2),
  );
}

function toOrderStatus(value: string): OrderStatus {
  if (
    value === 'pending' ||
    value === 'paid' ||
    value === 'shipped' ||
    value === 'completed' ||
    value === 'cancelled'
  ) {
    return value;
  }

  throw new Error('주문 상태가 허용된 값이 아닙니다.');
}
