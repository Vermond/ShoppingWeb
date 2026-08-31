import { AuthRequestError } from './auth.repository';

export type AdminReportQuery = {
  from: string;
  to: string;
};

type AdminReportMetric<T> = {
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

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null;
}

function getResponseMessage(result: unknown, fallback: string): string {
  if (!isRecord(result)) {
    return fallback;
  }

  if (typeof result.message === 'string') {
    return result.message;
  }

  if (Array.isArray(result.message)) {
    const messages = result.message.filter(
      (message): message is string => typeof message === 'string',
    );

    if (messages.length > 0) {
      return messages.join('\n');
    }
  }

  if (typeof result.error === 'string') {
    return result.error;
  }

  return fallback;
}

function getResponseCode(result: unknown): string | undefined {
  return isRecord(result) && typeof result.code === 'string'
    ? result.code
    : undefined;
}

function readString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`관리자 리포트 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`관리자 리포트 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readNullableNumber(value: unknown, fieldName: string): number | null {
  if (value === null) {
    return null;
  }

  return readNumber(value, fieldName);
}

function readArray(value: unknown, fieldName: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`관리자 리포트 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readMetric<T>(
  value: unknown,
  fieldName: string,
  readValue: (input: unknown, valueFieldName: string) => T,
): AdminReportMetric<T> {
  if (!isRecord(value)) {
    throw new Error(`관리자 리포트 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return {
    value: readValue(value.value, `${fieldName}.value`),
    change_rate_percent: readNullableNumber(
      value.change_rate_percent,
      `${fieldName}.change_rate_percent`,
    ),
  };
}

function readPeriod(value: unknown, fieldName: string) {
  if (!isRecord(value)) {
    throw new Error(`관리자 리포트 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return {
    from: readString(value.from, `${fieldName}.from`),
    to: readString(value.to, `${fieldName}.to`),
  };
}

function readResponse(value: unknown): AdminReportResponse {
  if (!isRecord(value)) {
    throw new Error('관리자 리포트 응답 형식이 올바르지 않습니다.');
  }

  const summary = isRecord(value.summary) ? value.summary : null;

  if (!summary) {
    throw new Error('관리자 리포트 응답에 summary 정보가 없습니다.');
  }

  const dailySales = readArray(value.daily_sales, 'daily_sales').map(
    (item, index) => {
      if (!isRecord(item)) {
        throw new Error(`daily_sales[${index}] 응답 형식이 올바르지 않습니다.`);
      }

      return {
        date: readString(item.date, `daily_sales[${index}].date`),
        revenue: readString(item.revenue, `daily_sales[${index}].revenue`),
        order_count: readNumber(
          item.order_count,
          `daily_sales[${index}].order_count`,
        ),
      };
    },
  );

  const categorySales = readArray(value.category_sales, 'category_sales').map(
    (item, index) => {
      if (!isRecord(item)) {
        throw new Error(`category_sales[${index}] 응답 형식이 올바르지 않습니다.`);
      }

      return {
        category_id: readString(
          item.category_id,
          `category_sales[${index}].category_id`,
        ),
        category_name: readString(
          item.category_name,
          `category_sales[${index}].category_name`,
        ),
        revenue: readString(
          item.revenue,
          `category_sales[${index}].revenue`,
        ),
        sales_quantity: readNumber(
          item.sales_quantity,
          `category_sales[${index}].sales_quantity`,
        ),
        sales_ratio_percent: readNumber(
          item.sales_ratio_percent,
          `category_sales[${index}].sales_ratio_percent`,
        ),
      };
    },
  );

  const topProducts = readArray(value.top_products, 'top_products').map(
    (item, index) => {
      if (!isRecord(item)) {
        throw new Error(`top_products[${index}] 응답 형식이 올바르지 않습니다.`);
      }

      return {
        product_id: readString(item.product_id, `top_products[${index}].product_id`),
        product_name: readString(
          item.product_name,
          `top_products[${index}].product_name`,
        ),
        category_name: readString(
          item.category_name,
          `top_products[${index}].category_name`,
        ),
        sales_quantity: readNumber(
          item.sales_quantity,
          `top_products[${index}].sales_quantity`,
        ),
        revenue: readString(item.revenue, `top_products[${index}].revenue`),
      };
    },
  );

  return {
    period: readPeriod(value.period, 'period'),
    comparison_period: readPeriod(value.comparison_period, 'comparison_period'),
    summary: {
      revenue: readMetric(summary.revenue, 'summary.revenue', readString),
      order_count: readMetric(summary.order_count, 'summary.order_count', readNumber),
      average_order_amount: readMetric(
        summary.average_order_amount,
        'summary.average_order_amount',
        readString,
      ),
      new_customer_count: readMetric(
        summary.new_customer_count,
        'summary.new_customer_count',
        readNumber,
      ),
      repurchase_rate_percent: readMetric(
        summary.repurchase_rate_percent,
        'summary.repurchase_rate_percent',
        readNumber,
      ),
    },
    daily_sales: dailySales,
    category_sales: categorySales,
    top_products: topProducts,
  };
}

export async function requestAdminReportsOnServer(
  cookieHeader: string,
  query: AdminReportQuery,
): Promise<AdminReportResponse> {
  const backendApiBaseUrl = process.env.BACKEND_API_BASE_URL?.replace(
    /\/$/,
    '',
  );

  if (!backendApiBaseUrl) {
    throw new AuthRequestError(
      '백엔드 API 주소가 설정되지 않아 관리자 리포트를 불러올 수 없습니다.',
      { status: 500 },
    );
  }

  const params = new URLSearchParams({ from: query.from, to: query.to });
  let response: Response;

  try {
    response = await fetch(
      `${backendApiBaseUrl}/api/admin/reports?${params.toString()}`,
      {
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
        cache: 'no-store',
      },
    );
  } catch {
    throw new AuthRequestError('관리자 리포트 서버와 통신하지 못했습니다.', {
      status: 503,
    });
  }

  const result: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AuthRequestError(
      getResponseMessage(result, '관리자 리포트를 불러오지 못했습니다.'),
      {
        code: getResponseCode(result),
        status: response.status,
      },
    );
  }

  try {
    return readResponse(result);
  } catch (error) {
    throw new AuthRequestError(
      error instanceof Error
        ? error.message
        : '관리자 리포트 응답을 처리하지 못했습니다.',
      { status: 502 },
    );
  }
}
