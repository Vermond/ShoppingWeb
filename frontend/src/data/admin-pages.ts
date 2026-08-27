import type { ProductCategory } from "../types/catalog";

export type AdminProductStatus = "판매중" | "재고 부족" | "판매 예정";
export type AdminCustomerStatus = "활성" | "휴면";

export type AdminOrderRecord = {
  id: string;
  customer: string;
  product: string;
  amount: number;
  status: "결제 완료" | "상품 준비중" | "배송중" | "배송 완료";
  payment: "카드" | "카카오페이" | "네이버페이";
  itemCount: number;
  orderedAt: string;
};

export type AdminProductRecord = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  sales: number;
  status: AdminProductStatus;
  updatedAt: string;
  color: string;
};

export type AdminCustomerRecord = {
  id: string;
  name: string;
  email: string;
  orders: number;
  totalSpent: number;
  lastOrderAt: string;
  status: AdminCustomerStatus;
  joinedAt: string;
};

export type AdminReportData = {
  summary: Array<{ label: string; value: string; change: string }>;
  sales: Array<{ label: string; value: number }>;
  categories: Array<{ label: ProductCategory; value: number; color: string }>;
  channels: Array<{ label: string; value: number; color: string }>;
};

export type AdminSettingsData = {
  storeName: string;
  supportEmail: string;
  orderNotifications: boolean;
  lowStockNotifications: boolean;
  newsletterNotifications: boolean;
  defaultShippingFee: number;
  freeShippingThreshold: number;
};

const orders: AdminOrderRecord[] = [
  {
    id: "MR-20250826-184",
    customer: "김서윤",
    product: "모리 세라믹 머그 외 1건",
    amount: 56000,
    status: "결제 완료",
    payment: "카카오페이",
    itemCount: 2,
    orderedAt: "2025.08.26 14:32",
  },
  {
    id: "MR-20250826-183",
    customer: "이도현",
    product: "데일리 오버 셔츠",
    amount: 89000,
    status: "상품 준비중",
    payment: "카드",
    itemCount: 1,
    orderedAt: "2025.08.26 13:18",
  },
  {
    id: "MR-20250826-182",
    customer: "박하린",
    product: "소프트 버킷 백",
    amount: 119000,
    status: "배송중",
    payment: "네이버페이",
    itemCount: 1,
    orderedAt: "2025.08.26 11:46",
  },
  {
    id: "MR-20250825-181",
    customer: "최민준",
    product: "클라우드 핸드 밤 외 2건",
    amount: 92000,
    status: "배송 완료",
    payment: "카드",
    itemCount: 3,
    orderedAt: "2025.08.25 17:03",
  },
  {
    id: "MR-20250825-180",
    customer: "정유진",
    product: "오크 데스크 트레이",
    amount: 42000,
    status: "상품 준비중",
    payment: "카카오페이",
    itemCount: 1,
    orderedAt: "2025.08.25 15:27",
  },
  {
    id: "MR-20250825-179",
    customer: "오지훈",
    product: "클리어 버블 베이스",
    amount: 36000,
    status: "결제 완료",
    payment: "카드",
    itemCount: 1,
    orderedAt: "2025.08.25 12:11",
  },
];

const products: AdminProductRecord[] = [
  { id: "mori-mug", name: "모리 세라믹 머그", category: "리빙", price: 28000, stock: 8, sales: 128, status: "재고 부족", updatedAt: "2025.08.26", color: "#d9cbb7" },
  { id: "daily-shirt", name: "데일리 오버 셔츠", category: "패션", price: 89000, stock: 24, sales: 96, status: "판매중", updatedAt: "2025.08.25", color: "#aebcae" },
  { id: "soft-bucket", name: "소프트 버킷 백", category: "액세서리", price: 119000, stock: 31, sales: 74, status: "판매중", updatedAt: "2025.08.24", color: "#d58f70" },
  { id: "cloud-balm", name: "클라우드 핸드 밤", category: "뷰티", price: 24000, stock: 36, sales: 63, status: "판매중", updatedAt: "2025.08.23", color: "#ded9d2" },
  { id: "oak-tray", name: "오크 데스크 트레이", category: "리빙", price: 42000, stock: 15, sales: 41, status: "판매 예정", updatedAt: "2025.08.21", color: "#be8d61" },
  { id: "clear-vase", name: "클리어 버블 베이스", category: "리빙", price: 36000, stock: 19, sales: 38, status: "판매중", updatedAt: "2025.08.20", color: "#b8ced0" },
];

const customers: AdminCustomerRecord[] = [
  { id: "CUS-00124", name: "김서윤", email: "seoyoon.kim@example.com", orders: 8, totalSpent: 624000, lastOrderAt: "오늘 14:32", status: "활성", joinedAt: "2025.03.12" },
  { id: "CUS-00123", name: "이도현", email: "dohyun.lee@example.com", orders: 4, totalSpent: 318000, lastOrderAt: "오늘 13:18", status: "활성", joinedAt: "2025.05.08" },
  { id: "CUS-00122", name: "박하린", email: "harin.park@example.com", orders: 6, totalSpent: 511000, lastOrderAt: "오늘 11:46", status: "활성", joinedAt: "2025.01.27" },
  { id: "CUS-00121", name: "최민준", email: "minjun.choi@example.com", orders: 2, totalSpent: 134000, lastOrderAt: "어제 17:03", status: "활성", joinedAt: "2025.07.19" },
  { id: "CUS-00120", name: "정유진", email: "yujin.jung@example.com", orders: 1, totalSpent: 42000, lastOrderAt: "어제 15:27", status: "휴면", joinedAt: "2024.12.04" },
];

const report: AdminReportData = {
  summary: [
    { label: "총 매출", value: "₩12,480,000", change: "+18.4%" },
    { label: "총 주문", value: "184건", change: "+12.8%" },
    { label: "객단가", value: "₩67,826", change: "+4.1%" },
    { label: "재구매율", value: "28.6%", change: "+3.8%" },
  ],
  sales: [
    { label: "08.20", value: 42 },
    { label: "08.21", value: 56 },
    { label: "08.22", value: 48 },
    { label: "08.23", value: 72 },
    { label: "08.24", value: 64 },
    { label: "08.25", value: 81 },
    { label: "08.26", value: 94 },
  ],
  categories: [
    { label: "리빙", value: 39, color: "#b7c6b5" },
    { label: "패션", value: 25, color: "#d8b69f" },
    { label: "액세서리", value: 22, color: "#df8a67" },
    { label: "뷰티", value: 14, color: "#d9d0bf" },
  ],
  channels: [
    { label: "직접 유입", value: 48, color: "#1f211e" },
    { label: "Instagram", value: 27, color: "#df6d45" },
    { label: "검색", value: 17, color: "#b7c6b5" },
    { label: "추천", value: 8, color: "#d9d0bf" },
  ],
};

const settings: AdminSettingsData = {
  storeName: "Morrow Studio",
  supportEmail: "hello@morrow.studio",
  orderNotifications: true,
  lowStockNotifications: true,
  newsletterNotifications: false,
  defaultShippingFee: 3000,
  freeShippingThreshold: 30000,
};

// Replace these functions with API calls when the admin backend contract is ready.
export async function getAdminOrdersData() {
  return { orders };
}

export async function getAdminProductsData() {
  return { products };
}

export async function getAdminCustomersData() {
  return { customers };
}

export async function getAdminReportData() {
  return report;
}

export async function getAdminSettingsData() {
  return settings;
}
