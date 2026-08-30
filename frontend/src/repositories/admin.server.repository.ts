import { AuthRequestError } from "./auth.repository";

export type AdminDashboardMetricResponse = {
  value: string | number;
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
    revenue: AdminDashboardMetricResponse;
    order_count: AdminDashboardMetricResponse;
    new_customer_count: AdminDashboardMetricResponse;
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
    product_summary: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
    }>;
    product_count: number;
    payment_amount: string;
    status: "pending" | "paid" | "shipped" | "completed" | "cancelled";
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

type AdminOrderStatusResponse = AdminDashboardResponse["recent_orders"][number]["status"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`관리자 대시보드 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`관리자 대시보드 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readMetric(
  value: unknown,
  fieldName: string,
): AdminDashboardMetricResponse {
  if (!isRecord(value)) {
    throw new Error(`관리자 대시보드 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  const metricValue = value.value;
  if (typeof metricValue !== "string" && typeof metricValue !== "number") {
    throw new Error(`관리자 대시보드 응답의 ${fieldName}.value 값이 올바르지 않습니다.`);
  }

  const changeRate = value.change_rate_percent;
  if (changeRate !== null && (typeof changeRate !== "number" || !Number.isFinite(changeRate))) {
    throw new Error(
      `관리자 대시보드 응답의 ${fieldName}.change_rate_percent 값이 올바르지 않습니다.`,
    );
  }

  return {
    value: metricValue,
    change_rate_percent: changeRate,
  };
}

function readArray(value: unknown, fieldName: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`관리자 대시보드 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readOrderStatus(value: unknown, fieldName: string): AdminOrderStatusResponse {
  if (
    value !== "pending" &&
    value !== "paid" &&
    value !== "shipped" &&
    value !== "completed" &&
    value !== "cancelled"
  ) {
    throw new Error(`${fieldName} 응답 값이 올바르지 않습니다.`);
  }

  return value;
}

function readDashboardResponse(value: unknown): AdminDashboardResponse {
  if (!isRecord(value)) {
    throw new Error("관리자 대시보드 응답 형식이 올바르지 않습니다.");
  }

  const period = isRecord(value.period) ? value.period : null;
  const comparisonPeriod = isRecord(value.comparison_period)
    ? value.comparison_period
    : null;
  const summary = isRecord(value.summary) ? value.summary : null;

  if (!period || !comparisonPeriod || !summary) {
    throw new Error("관리자 대시보드 응답에 필수 영역이 없습니다.");
  }

  const dailySales = readArray(value.daily_sales, "daily_sales").map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`daily_sales[${index}] 응답 형식이 올바르지 않습니다.`);
    }

    return {
      date: readString(item.date, `daily_sales[${index}].date`),
      revenue: readString(item.revenue, `daily_sales[${index}].revenue`),
    };
  });

  const categorySales = readArray(value.category_sales, "category_sales").map(
    (item, index) => {
      if (!isRecord(item)) {
        throw new Error(`category_sales[${index}] 응답 형식이 올바르지 않습니다.`);
      }

      return {
        category_id: readString(item.category_id, `category_sales[${index}].category_id`),
        category_name: readString(
          item.category_name,
          `category_sales[${index}].category_name`,
        ),
        revenue: readString(item.revenue, `category_sales[${index}].revenue`),
        sales_ratio_percent: readFiniteNumber(
          item.sales_ratio_percent,
          `category_sales[${index}].sales_ratio_percent`,
        ),
      };
    },
  );

  const recentOrders = readArray(value.recent_orders, "recent_orders").map(
    (item, index) => {
      if (!isRecord(item)) {
        throw new Error(`recent_orders[${index}] 응답 형식이 올바르지 않습니다.`);
      }

      const productSummary = readArray(
        item.product_summary,
        `recent_orders[${index}].product_summary`,
      ).map((product, productIndex) => {
        if (!isRecord(product)) {
          throw new Error(
            `recent_orders[${index}].product_summary[${productIndex}] 응답 형식이 올바르지 않습니다.`,
          );
        }

        return {
          product_id: readString(
            product.product_id,
            `recent_orders[${index}].product_summary[${productIndex}].product_id`,
          ),
          product_name: readString(
            product.product_name,
            `recent_orders[${index}].product_summary[${productIndex}].product_name`,
          ),
          quantity: readFiniteNumber(
            product.quantity,
            `recent_orders[${index}].product_summary[${productIndex}].quantity`,
          ),
        };
      });

      const status = readOrderStatus(item.status, `recent_orders[${index}].status`);

      return {
        order_id: readString(item.order_id, `recent_orders[${index}].order_id`),
        customer_id: readString(item.customer_id, `recent_orders[${index}].customer_id`),
        customer_name: readString(
          item.customer_name,
          `recent_orders[${index}].customer_name`,
        ),
        product_summary: productSummary,
        product_count: readFiniteNumber(
          item.product_count,
          `recent_orders[${index}].product_count`,
        ),
        payment_amount: readString(
          item.payment_amount,
          `recent_orders[${index}].payment_amount`,
        ),
        status,
        ordered_at: readString(item.ordered_at, `recent_orders[${index}].ordered_at`),
      };
    },
  );

  const inventory = readArray(value.inventory, "inventory").map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`inventory[${index}] 응답 형식이 올바르지 않습니다.`);
    }

    if (typeof item.low_stock !== "boolean") {
      throw new Error(`inventory[${index}].low_stock 응답 값이 올바르지 않습니다.`);
    }

    return {
      product_id: readString(item.product_id, `inventory[${index}].product_id`),
      product_name: readString(item.product_name, `inventory[${index}].product_name`),
      category_id: readString(item.category_id, `inventory[${index}].category_id`),
      category_name: readString(
        item.category_name,
        `inventory[${index}].category_name`,
      ),
      stock: readFiniteNumber(item.stock, `inventory[${index}].stock`),
      low_stock: item.low_stock,
      period_sold_quantity: readFiniteNumber(
        item.period_sold_quantity,
        `inventory[${index}].period_sold_quantity`,
      ),
    };
  });

  return {
    period: {
      from: readString(period.from, "period.from"),
      to: readString(period.to, "period.to"),
    },
    comparison_period: {
      from: readString(comparisonPeriod.from, "comparison_period.from"),
      to: readString(comparisonPeriod.to, "comparison_period.to"),
    },
    summary: {
      revenue: readMetric(summary.revenue, "summary.revenue"),
      order_count: readMetric(summary.order_count, "summary.order_count"),
      new_customer_count: readMetric(
        summary.new_customer_count,
        "summary.new_customer_count",
      ),
    },
    daily_sales: dailySales,
    category_sales: categorySales,
    recent_orders: recentOrders,
    inventory,
  };
}

function getResponseMessage(result: unknown, fallback: string): string {
  if (!isRecord(result) || typeof result.message !== "string") {
    return fallback;
  }

  return result.message;
}

export async function requestAdminDashboardOnServer(
  cookieHeader: string,
): Promise<AdminDashboardResponse> {
  const backendApiBaseUrl = process.env.BACKEND_API_BASE_URL?.replace(/\/$/, "");

  if (!backendApiBaseUrl) {
    throw new AuthRequestError(
      "백엔드 API 주소가 설정되지 않아 관리자 대시보드를 불러올 수 없습니다.",
      { status: 500 },
    );
  }

  let response: Response;

  try {
    response = await fetch(`${backendApiBaseUrl}/api/admin/dashboard`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
  } catch {
    throw new AuthRequestError(
      "관리자 대시보드 서버와 통신하지 못했습니다.",
      { status: 503 },
    );
  }

  const result: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AuthRequestError(
      getResponseMessage(result, "관리자 대시보드를 불러오지 못했습니다."),
      {
        code: isRecord(result) && typeof result.code === "string" ? result.code : undefined,
        status: response.status,
      },
    );
  }

  try {
    return readDashboardResponse(result);
  } catch (error) {
    throw new AuthRequestError(
      error instanceof Error
        ? error.message
        : "관리자 대시보드 응답을 처리하지 못했습니다.",
      { status: 502 },
    );
  }
}
