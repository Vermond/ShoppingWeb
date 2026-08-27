import type { OrderSummary } from "../../types/orders";

export const mockOrders: OrderSummary[] = [
  {
    id: "MORROW-250615",
    status: "배송 완료",
    createdAt: "2025. 06. 15",
    total: 117000,
    itemCount: 2,
  },
  {
    id: "MORROW-250528",
    status: "상품 준비중",
    createdAt: "2025. 05. 28",
    total: 89000,
    itemCount: 1,
  },
];
