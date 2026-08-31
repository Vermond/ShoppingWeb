import type {
  AdminReportQuery,
  AdminReportResponse,
} from '../repositories/admin-reports.server.repository';

export type AdminReportPeriodPreset = '7d' | '30d' | 'quarter';

export type AdminReportData = {
  period: AdminReportResponse['period'];
  comparisonPeriod: AdminReportResponse['comparison_period'];
  summary: Array<{
    id: string;
    label: string;
    value: string;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
    helper: string;
  }>;
  sales: Array<{
    date: string;
    label: string;
    revenue: number;
    orderCount: number;
  }>;
  categories: Array<{
    id: string;
    label: string;
    revenue: number;
    salesQuantity: number;
    share: number;
    color: string;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    category: string;
    revenue: number;
    salesQuantity: number;
  }>;
  preset: AdminReportPeriodPreset;
};

export type AdminReportDateRange = AdminReportQuery;

const categoryColors = ['#b7c6b5', '#d8b69f', '#df8a67', '#d9d0bf'];

function toFiniteNumber(value: string | number, fieldName: string): number {
  const numberValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`관리자 리포트의 ${fieldName} 값을 표시할 수 없습니다.`);
  }

  return numberValue;
}

function formatWon(value: string | number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(toFiniteNumber(value, '금액'));
}

function formatCount(value: string | number, unit: string): string {
  return `${toFiniteNumber(value, unit).toLocaleString('ko-KR')}${unit}`;
}

function formatChangeRate(changeRate: number | null): {
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
} {
  if (changeRate === null) {
    return { change: '비교 불가', changeType: 'neutral' };
  }

  const sign = changeRate > 0 ? '+' : '';

  return {
    change: `${sign}${changeRate.toFixed(1)}%`,
    changeType: changeRate < 0 ? 'negative' : 'positive',
  };
}

function formatDateLabel(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match ? `${match[2]}.${match[3]}` : date;
}

function mapMetric(
  id: string,
  label: string,
  value: string,
  changeRate: number | null,
  helper: string,
): AdminReportData['summary'][number] {
  const change = formatChangeRate(changeRate);

  return {
    id,
    label,
    value,
    change: change.change,
    changeType: change.changeType,
    helper,
  };
}

function formatSeoulDate(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function getQuarterStart(date: string): string {
  const [year, month] = date.split('-').map(Number);
  const quarterMonth = Math.floor((month - 1) / 3) * 3 + 1;

  return `${year}-${String(quarterMonth).padStart(2, '0')}-01`;
}

export function getAdminReportDateRange(
  preset: AdminReportPeriodPreset,
  now: Date = new Date(),
): AdminReportDateRange {
  const to = formatSeoulDate(now);

  if (preset === 'quarter') {
    return { from: getQuarterStart(to), to };
  }

  const dayCount = preset === '30d' ? 30 : 7;
  return { from: addDays(to, -(dayCount - 1)), to };
}

export function mapAdminReportResponse(
  response: AdminReportResponse,
  preset: AdminReportPeriodPreset,
): AdminReportData {
  return {
    period: response.period,
    comparisonPeriod: response.comparison_period,
    preset,
    summary: [
      mapMetric(
        'revenue',
        '총 매출',
        formatWon(response.summary.revenue.value),
        response.summary.revenue.change_rate_percent,
        '직전 동일 기간 대비',
      ),
      mapMetric(
        'orders',
        '총 주문',
        formatCount(response.summary.order_count.value, '건'),
        response.summary.order_count.change_rate_percent,
        '직전 동일 기간 대비',
      ),
      mapMetric(
        'average-order',
        '평균 주문 금액',
        formatWon(response.summary.average_order_amount.value),
        response.summary.average_order_amount.change_rate_percent,
        '직전 동일 기간 대비',
      ),
      mapMetric(
        'new-customers',
        '신규 고객',
        formatCount(response.summary.new_customer_count.value, '명'),
        response.summary.new_customer_count.change_rate_percent,
        '직전 동일 기간 대비',
      ),
      mapMetric(
        'repurchase-rate',
        '재구매율',
        `${response.summary.repurchase_rate_percent.value.toFixed(2)}%`,
        response.summary.repurchase_rate_percent.change_rate_percent,
        '구매 고객 중 2건 이상',
      ),
    ],
    sales: response.daily_sales.map((point) => ({
      date: point.date,
      label: formatDateLabel(point.date),
      revenue: toFiniteNumber(point.revenue, '일별 매출'),
      orderCount: point.order_count,
    })),
    categories: response.category_sales.map((category, index) => ({
      id: category.category_id,
      label: category.category_name,
      revenue: toFiniteNumber(category.revenue, '카테고리 매출'),
      salesQuantity: category.sales_quantity,
      share: category.sales_ratio_percent,
      color: categoryColors[index % categoryColors.length],
    })),
    topProducts: response.top_products.map((product) => ({
      id: product.product_id,
      name: product.product_name,
      category: product.category_name,
      revenue: toFiniteNumber(product.revenue, '상품 매출'),
      salesQuantity: product.sales_quantity,
    })),
  };
}

export async function getAdminReportData(
  cookieHeader: string,
  preset: AdminReportPeriodPreset,
): Promise<AdminReportData> {
  const { requestAdminReportsOnServer } = await import(
    '../repositories/admin-reports.server.repository'
  );
  const response = await requestAdminReportsOnServer(
    cookieHeader,
    getAdminReportDateRange(preset),
  );

  return mapAdminReportResponse(response, preset);
}
