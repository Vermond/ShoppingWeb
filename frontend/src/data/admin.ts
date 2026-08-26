import type { ProductCategory } from "./products";

export type AdminOrderStatus =
  | "결제 완료"
  | "상품 준비중"
  | "배송중"
  | "배송 완료";

export type AdminMetric = {
  id: string;
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative";
  helper: string;
  icon: "sales" | "orders" | "customers" | "conversion";
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
  category: ProductCategory;
  sales: number;
  share: number;
  color: string;
};

export type AdminInventoryItem = {
  id: string;
  name: string;
  category: ProductCategory;
  stock: number;
  targetStock: number;
  salesRate: number;
  color: string;
};

export type AdminSalesPoint = {
  label: string;
  value: number;
};

export type AdminDashboardData = {
  metrics: AdminMetric[];
  sales: AdminSalesPoint[];
  categoryPerformance: AdminCategoryPerformance[];
  orders: AdminOrder[];
  inventory: AdminInventoryItem[];
};

const adminDashboardData: AdminDashboardData = {
  metrics: [
    {
      id: "sales",
      label: "이번 달 매출",
      value: "₩12,480,000",
      change: "+18.4%",
      changeType: "positive",
      helper: "지난달 대비",
      icon: "sales",
    },
    {
      id: "orders",
      label: "신규 주문",
      value: "184",
      change: "+12.8%",
      changeType: "positive",
      helper: "지난달 대비",
      icon: "orders",
    },
    {
      id: "customers",
      label: "신규 고객",
      value: "96",
      change: "+8.2%",
      changeType: "positive",
      helper: "지난달 대비",
      icon: "customers",
    },
    {
      id: "conversion",
      label: "구매 전환율",
      value: "4.8%",
      change: "-0.6%",
      changeType: "negative",
      helper: "지난달 대비",
      icon: "conversion",
    },
  ],
  sales: [
    { label: "월", value: 32 },
    { label: "화", value: 47 },
    { label: "수", value: 41 },
    { label: "목", value: 59 },
    { label: "금", value: 72 },
    { label: "토", value: 64 },
    { label: "일", value: 86 },
  ],
  categoryPerformance: [
    { category: "리빙", sales: 4860000, share: 39, color: "#b7c6b5" },
    { category: "패션", sales: 3120000, share: 25, color: "#d8b69f" },
    { category: "액세서리", sales: 2710000, share: 22, color: "#df8a67" },
    { category: "뷰티", sales: 1790000, share: 14, color: "#d9d0bf" },
  ],
  orders: [
    {
      id: "MR-20250826-184",
      customer: "김서윤",
      initials: "서윤",
      product: "모리 세라믹 머그 외 1건",
      amount: 56000,
      status: "결제 완료",
      orderedAt: "오늘 14:32",
    },
    {
      id: "MR-20250826-183",
      customer: "이도현",
      initials: "도현",
      product: "데일리 오버 셔츠",
      amount: 89000,
      status: "상품 준비중",
      orderedAt: "오늘 13:18",
    },
    {
      id: "MR-20250826-182",
      customer: "박하린",
      initials: "하린",
      product: "소프트 버킷 백",
      amount: 119000,
      status: "배송중",
      orderedAt: "오늘 11:46",
    },
    {
      id: "MR-20250825-181",
      customer: "최민준",
      initials: "민준",
      product: "클라우드 핸드 밤 외 2건",
      amount: 92000,
      status: "배송 완료",
      orderedAt: "어제 17:03",
    },
    {
      id: "MR-20250825-180",
      customer: "정유진",
      initials: "유진",
      product: "오크 데스크 트레이",
      amount: 42000,
      status: "상품 준비중",
      orderedAt: "어제 15:27",
    },
  ],
  inventory: [
    {
      id: "mori-mug",
      name: "모리 세라믹 머그",
      category: "리빙",
      stock: 8,
      targetStock: 40,
      salesRate: 82,
      color: "#d9cbb7",
    },
    {
      id: "daily-shirt",
      name: "데일리 오버 셔츠",
      category: "패션",
      stock: 24,
      targetStock: 40,
      salesRate: 64,
      color: "#aebcae",
    },
    {
      id: "soft-bucket",
      name: "소프트 버킷 백",
      category: "액세서리",
      stock: 31,
      targetStock: 40,
      salesRate: 51,
      color: "#d58f70",
    },
    {
      id: "cloud-balm",
      name: "클라우드 핸드 밤",
      category: "뷰티",
      stock: 36,
      targetStock: 40,
      salesRate: 38,
      color: "#ded9d2",
    },
  ],
};

// Replace this function with a fetch to the admin API when the backend contract is ready.
export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  return adminDashboardData;
}
