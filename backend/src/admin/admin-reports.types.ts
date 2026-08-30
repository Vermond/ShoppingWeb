import Decimal from 'decimal.js';

export type AdminReportSummaryRow = {
  revenue: string;
  order_count: number;
  average_order_amount: string;
  new_customer_count: number;
  repurchase_rate_percent: string;
};

export type AdminReportDailySalesRow = {
  date: string;
  revenue: string;
  order_count: number;
};

export type AdminReportCategorySalesRow = {
  category_id: string;
  category_name: string;
  revenue: string;
  sales_quantity: number;
};

export type AdminReportTopProductRow = {
  product_id: string;
  product_name: string;
  category_name: string;
  sales_quantity: number;
  revenue: string;
};

export type AdminReportRepositoryResult = {
  currentSummary: AdminReportSummaryRow;
  previousSummary: AdminReportSummaryRow;
  dailySales: AdminReportDailySalesRow[];
  categorySales: AdminReportCategorySalesRow[];
  topProducts: AdminReportTopProductRow[];
};

export type AdminReportMetric<T> = {
  value: T;
  change_rate_percent: number | null;
};

export type AdminReportResponse = {
  period: {
    from: string;
    to: string;
  };
  comparison_period: {
    from: string;
    to: string;
  };
  summary: {
    revenue: AdminReportMetric<string>;
    order_count: AdminReportMetric<number>;
    average_order_amount: AdminReportMetric<string>;
    new_customer_count: AdminReportMetric<number>;
    repurchase_rate_percent: AdminReportMetric<number>;
  };
  daily_sales: Array<{
    date: string;
    revenue: string;
    order_count: number;
  }>;
  category_sales: Array<{
    category_id: string;
    category_name: string;
    revenue: string;
    sales_quantity: number;
    sales_ratio_percent: number;
  }>;
  top_products: Array<{
    product_id: string;
    product_name: string;
    category_name: string;
    sales_quantity: number;
    revenue: string;
  }>;
};

export function serializeAdminReport(
  result: AdminReportRepositoryResult,
  period: {
    from: string;
    to: string;
    comparisonFrom: string;
    comparisonTo: string;
  },
  dailySales: AdminReportDailySalesRow[],
): AdminReportResponse {
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
      revenue: createMoneyMetric(
        result.currentSummary.revenue,
        result.previousSummary.revenue,
      ),
      order_count: createNumberMetric(
        result.currentSummary.order_count,
        result.previousSummary.order_count,
      ),
      average_order_amount: createMoneyMetric(
        result.currentSummary.average_order_amount,
        result.previousSummary.average_order_amount,
      ),
      new_customer_count: createNumberMetric(
        result.currentSummary.new_customer_count,
        result.previousSummary.new_customer_count,
      ),
      repurchase_rate_percent: createPercentMetric(
        result.currentSummary.repurchase_rate_percent,
        result.previousSummary.repurchase_rate_percent,
      ),
    },
    daily_sales: dailySales.map((row) => ({
      date: row.date,
      revenue: new Decimal(row.revenue).toFixed(2),
      order_count: row.order_count,
    })),
    category_sales: result.categorySales.map((category) => ({
      category_id: category.category_id,
      category_name: category.category_name,
      revenue: new Decimal(category.revenue).toFixed(2),
      sales_quantity: category.sales_quantity,
      sales_ratio_percent: calculateRatio(category.revenue, categoryTotal),
    })),
    top_products: result.topProducts.map((product) => ({
      product_id: product.product_id,
      product_name: product.product_name,
      category_name: product.category_name,
      sales_quantity: product.sales_quantity,
      revenue: new Decimal(product.revenue).toFixed(2),
    })),
  };
}

export function calculateReportChangeRate(
  current: Decimal.Value,
  previous: Decimal.Value,
): number | null {
  const currentValue = new Decimal(current);
  const previousValue = new Decimal(previous);

  if (previousValue.isZero()) {
    return null;
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

function createMoneyMetric(
  current: Decimal.Value,
  previous: Decimal.Value,
): AdminReportMetric<string> {
  return {
    value: new Decimal(current).toFixed(2),
    change_rate_percent: calculateReportChangeRate(current, previous),
  };
}

function createNumberMetric(
  current: number,
  previous: number,
): AdminReportMetric<number> {
  return {
    value: current,
    change_rate_percent: calculateReportChangeRate(current, previous),
  };
}

function createPercentMetric(
  current: Decimal.Value,
  previous: Decimal.Value,
): AdminReportMetric<number> {
  return {
    value: Number(new Decimal(current).toFixed(2)),
    change_rate_percent: calculateReportChangeRate(current, previous),
  };
}

function calculateRatio(value: string, total: Decimal): number {
  if (total.isZero()) {
    return 0;
  }

  return Number(
    new Decimal(value).div(total).mul(100).toDecimalPlaces(2).toFixed(2),
  );
}
