import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdminReportDateRange,
  mapAdminReportResponse,
} from "../src/data/admin-reports.ts";
import type { AdminReportResponse } from "../src/repositories/admin-reports.server.repository.ts";

const reportResponse: AdminReportResponse = {
  period: { from: "2026-08-24", to: "2026-08-30" },
  comparison_period: { from: "2026-08-17", to: "2026-08-23" },
  summary: {
    revenue: { value: "1234000", change_rate_percent: 12.5 },
    order_count: { value: 12, change_rate_percent: null },
    average_order_amount: { value: "102833.3333", change_rate_percent: -4.2 },
    new_customer_count: { value: 4, change_rate_percent: 0 },
    repurchase_rate_percent: { value: 28.5, change_rate_percent: null },
  },
  daily_sales: [
    { date: "2026-08-24", revenue: "100000", order_count: 1 },
    { date: "2026-08-30", revenue: "1134000", order_count: 11 },
  ],
  category_sales: [
    {
      category_id: "category-1",
      category_name: "키보드",
      revenue: "900000",
      sales_quantity: 9,
      sales_ratio_percent: 72.9,
    },
  ],
  top_products: [
    {
      product_id: "product-1",
      product_name: "무선 기계식 키보드",
      category_name: "키보드",
      sales_quantity: 6,
      revenue: "600000",
    },
  ],
};

test("관리자 리포트 기간 프리셋이 서울 날짜 기준으로 계산된다", () => {
  const now = new Date("2026-08-30T03:00:00.000Z");

  assert.deepEqual(getAdminReportDateRange("7d", now), {
    from: "2026-08-24",
    to: "2026-08-30",
  });
  assert.deepEqual(getAdminReportDateRange("30d", now), {
    from: "2026-08-01",
    to: "2026-08-30",
  });
  assert.deepEqual(getAdminReportDateRange("quarter", now), {
    from: "2026-07-01",
    to: "2026-08-30",
  });
});

test("관리자 리포트 응답이 화면 표시용 데이터로 매핑된다", () => {
  const report = mapAdminReportResponse(reportResponse, "7d");

  assert.equal(report.preset, "7d");
  assert.equal(report.summary[0].value, "₩1,234,000");
  assert.equal(report.summary[0].change, "+12.5%");
  assert.equal(report.summary[1].value, "12건");
  assert.equal(report.summary[1].change, "비교 불가");
  assert.equal(report.summary[2].changeType, "negative");
  assert.equal(report.sales[1].revenue, 1134000);
  assert.equal(report.sales[1].orderCount, 11);
  assert.equal(report.categories[0].share, 72.9);
  assert.equal(report.topProducts[0].id, "product-1");
  assert.equal(report.topProducts[0].salesQuantity, 6);
});
