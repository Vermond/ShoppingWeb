export type ProductCategory = "리빙" | "패션" | "액세서리" | "뷰티";
export type ProductFilter = "전체" | ProductCategory;

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  tag?: string;
  description: string;
  color: string;
  art: "ceramic" | "linen" | "bag" | "glow" | "wood" | "glass";
};

// Mock data for now. Replace this collection with an API request when the catalog is connected.
export const products: Product[] = [
  { id: "mori-mug", name: "모리 세라믹 머그", category: "리빙", price: 28000, tag: "NEW", description: "아침의 온도를 오래 담아두는 손잡이 머그", color: "#d9cbb7", art: "ceramic" },
  { id: "daily-shirt", name: "데일리 오버 셔츠", category: "패션", price: 89000, tag: "BEST", description: "가볍게 걸치고 매일 다른 표정을 만드는 셔츠", color: "#aebcae", art: "linen" },
  { id: "soft-bucket", name: "소프트 버킷 백", category: "액세서리", price: 119000, description: "부드러운 실루엣, 넉넉한 하루의 수납", color: "#d58f70", art: "bag" },
  { id: "cloud-balm", name: "클라우드 핸드 밤", category: "뷰티", price: 24000, tag: "RESTOCK", description: "손끝에 가볍게 녹아드는 무향 보습 밤", color: "#ded9d2", art: "glow" },
  { id: "oak-tray", name: "오크 데스크 트레이", category: "리빙", price: 42000, description: "흩어진 작은 물건을 위한 단정한 자리", color: "#be8d61", art: "wood" },
  { id: "clear-vase", name: "클리어 버블 베이스", category: "리빙", price: 36000, description: "한 줄기만 꽂아도 공간이 맑아지는 유리 화병", color: "#b8ced0", art: "glass" },
];
