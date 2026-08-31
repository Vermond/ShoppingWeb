import type { AdminDashboardResponse } from "../repositories/admin.server.repository";

export type AdminOrderStatus =
  | "결제 대기"
  | "결제 완료"
  | "배송중"
  | "배송 완료"
  | "취소";

export type AdminMetric = {
  id: string;
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  helper: string;
  icon: "sales" | "orders" | "customers";
};

export type AdminOrder = {
  id: string;
  customer: string;
  initials: string;
  product: string;
  amount: number;
  status: AdminOrderStatus;
  orderedAt: string;
};

export type AdminCategoryPerformance = {
  category: string;
  sales: number;
  share: number;
  color: string;
};

export type AdminInventoryItem = {
  id: string;
  name: string;
  category: string;
  stock: number;
  lowStock: boolean;
  periodSoldQuantity: number;
  color: string;
};

export type AdminSalesPoint = {
  label: string;
  value: number;
};

export type AdminDashboardData = {
  period: {
    from: string;
    to: string;
  };
  metrics: AdminMetric[];
  sales: AdminSalesPoint[];
  categoryPerformance: AdminCategoryPerformance[];
  orders: AdminOrder[];
  inventory: AdminInventoryItem[];
};

const categoryColors = ["#b7c6b5", "#d8b69f", "#df8a67", "#d9d0bf"];
const inventoryColors = ["#d8b69f", "#b7c6b5", "#df8a67", "#d9d0bf"];

const orderStatusLabels: Record<
  AdminDashboardResponse["recent_orders"][number]["status"],
  AdminOrderStatus
> = {
  pending: "결제 대기",
  paid: "결제 완료",
  shipped: "배송중",
  completed: "배송 완료",
  cancelled: "취소",
};

function toFiniteNumber(value: string | number, fieldName: string): number {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`관리자 대시보드의 ${fieldName} 값을 표시할 수 없습니다.`);
  }

  return numberValue;
}

function formatWon(value: string | number): string {
  return `₩${Math.round(toFiniteNumber(value, "매출")).toLocaleString("ko-KR")}`;
}

function formatCount(value: string | number, unit: string): string {
  return `${toFiniteNumber(value, unit).toLocaleString("ko-KR")}${unit}`;
}

function formatChangeRate(changeRate: number | null): {
  change: string;
  changeType: AdminMetric["changeType"];
} {
  if (changeRate === null) {
    return { change: "비교 불가", changeType: "neutral" };
  }

  const sign = changeRate > 0 ? "+" : "";
  return {
    change: `${sign}${changeRate.toFixed(1)}%`,
    changeType: changeRate < 0 ? "negative" : "positive",
  };
}

function formatSalesLabel(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match ? `${match[2]}.${match[3]}` : date;
}

function formatOrderDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "시간 정보 없음";
  }

  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

  return `${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}

function formatProductSummary(
  products: AdminDashboardResponse["recent_orders"][number]["product_summary"],
): string {
  const firstProduct = products[0]?.product_name ?? "상품 정보 없음";

  if (products.length <= 1) {
    return firstProduct;
  }

  return `${firstProduct} 외 ${products.length - 1}건`;
}

function getInitials(name: string): string {
  return name.slice(0, 2) || "?";
}

function mapMetric(
  id: string,
  label: string,
  value: string | number,
  changeRate: number | null,
  formatter: (metricValue: string | number) => string,
  icon: AdminMetric["icon"],
  helper: string,
): AdminMetric {
  const change = formatChangeRate(changeRate);

  return {
    id,
    label,
    value: formatter(value),
    change: change.change,
    changeType: change.changeType,
    helper,
    icon,
  };
}

export function mapAdminDashboardResponse(
  response: AdminDashboardResponse,
): AdminDashboardData {
  return {
    period: response.period,
    metrics: [
      mapMetric(
        "sales",
        "기간 매출",
        response.summary.revenue.value,
        response.summary.revenue.change_rate_percent,
        formatWon,
        "sales",
        "직전 동일 기간 대비",
      ),
      mapMetric(
        "orders",
        "주문 수",
        response.summary.order_count.value,
        response.summary.order_count.change_rate_percent,
        (value) => formatCount(value, "건"),
        "orders",
        "직전 동일 기간 대비",
      ),
      mapMetric(
        "customers",
        "신규 고객",
        response.summary.new_customer_count.value,
        response.summary.new_customer_count.change_rate_percent,
        (value) => formatCount(value, "명"),
        "customers",
        "직전 동일 기간 대비",
      ),
    ],
    sales: response.daily_sales.slice(-7).map((point) => ({
      label: formatSalesLabel(point.date),
      value: toFiniteNumber(point.revenue, "일별 매출") / 10_000,
    })),
    categoryPerformance: response.category_sales.map((category, index) => ({
      category: category.category_name,
      sales: toFiniteNumber(category.revenue, "카테고리 매출"),
      share: category.sales_ratio_percent,
      color: categoryColors[index % categoryColors.length],
    })),
    orders: response.recent_orders.map((order) => ({
      id: order.order_id,
      customer: order.customer_name,
      initials: getInitials(order.customer_name),
      product: formatProductSummary(order.product_summary),
      amount: toFiniteNumber(order.payment_amount, "주문 결제 금액"),
      status: orderStatusLabels[order.status],
      orderedAt: formatOrderDate(order.ordered_at),
    })),
    inventory: response.inventory.map((item, index) => ({
      id: item.product_id,
      name: item.product_name,
      category: item.category_name,
      stock: item.stock,
      lowStock: item.low_stock,
      periodSoldQuantity: item.period_sold_quantity,
      color: inventoryColors[index % inventoryColors.length],
    })),
  };
}

export async function getAdminDashboardData(
  cookieHeader: string,
): Promise<AdminDashboardData> {
  const { requestAdminDashboardOnServer } = await import(
    "../repositories/admin.server.repository"
  );
  const response = await requestAdminDashboardOnServer(cookieHeader);

  return mapAdminDashboardResponse(response);
}
