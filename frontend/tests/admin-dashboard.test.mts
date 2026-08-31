import assert from "node:assert/strict";
import test from "node:test";
import { mapAdminDashboardResponse } from "../src/data/admin.ts";
import type { AdminDashboardResponse } from "../src/repositories/admin.server.repository.ts";

const dashboardResponse: AdminDashboardResponse = {
  period: { from: "2026-08-01", to: "2026-08-30" },
  comparison_period: { from: "2026-07-02", to: "2026-07-31" },
  summary: {
    revenue: { value: "1234000.00", change_rate_percent: 12.34 },
    order_count: { value: 12, change_rate_percent: null },
    new_customer_count: { value: 7, change_rate_percent: -4.2 },
  },
  daily_sales: Array.from({ length: 8 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    revenue: String((index + 1) * 10000),
  })),
  category_sales: [
    {
      category_id: "living",
      category_name: "리빙",
      revenue: "900000.00",
      sales_ratio_percent: 72.94,
    },
  ],
  recent_orders: [
    {
      order_id: "order-1",
      customer_id: "customer-1",
      customer_name: "김서윤",
      product_summary: [
        { product_id: "product-1", product_name: "세라믹 머그", quantity: 1 },
        { product_id: "product-2", product_name: "오크 트레이", quantity: 1 },
      ],
      product_count: 2,
      payment_amount: "56000.00",
      status: "pending",
      ordered_at: "2026-08-30T05:32:00.000Z",
    },
    {
      order_id: "order-2",
      customer_id: "customer-2",
      customer_name: "이도현",
      product_summary: [],
      product_count: 0,
      payment_amount: "0.00",
      status: "cancelled",
      ordered_at: "2026-08-29T05:32:00.000Z",
    },
  ],
  inventory: [
    {
      product_id: "product-1",
      product_name: "세라믹 머그",
      category_id: "living",
      category_name: "리빙",
      stock: 2,
      low_stock: true,
      period_sold_quantity: 8,
    },
  ],
};

test("관리자 대시보드 응답을 화면 데이터로 변환한다", () => {
  const data = mapAdminDashboardResponse(dashboardResponse);

  assert.equal(data.metrics.length, 3);
  assert.equal(data.metrics[0].value, "₩1,234,000");
  assert.equal(data.metrics[1].change, "비교 불가");
  assert.equal(data.metrics[2].changeType, "negative");
  assert.equal(data.sales.length, 7);
  assert.equal(data.sales[0].label, "08.02");
  assert.equal(data.orders[0].status, "결제 대기");
  assert.equal(data.orders[0].product, "세라믹 머그 외 1건");
  assert.equal(data.orders[1].status, "취소");
  assert.equal(data.inventory[0].lowStock, true);
});
