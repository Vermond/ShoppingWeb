import type {
  Product,
  ProductCategory,
  ProductDetail,
  ProductImage,
} from "../types/catalog";

export type CatalogCategory = {
  id: string;
  name: ProductCategory;
  count: number;
  tone: string;
};

export type CatalogData = {
  products: Product[];
  categories: CatalogCategory[];
  pagination: CatalogPagination;
};

export type CatalogPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type CatalogProductPage = {
  products: Product[];
  pagination: CatalogPagination;
};

export type ProductPageOptions = {
  page?: number;
  limit?: number;
  categoryId?: string | null;
  search?: string;
  sort?: "created_at_desc" | "price_asc" | "price_desc";
  categoryNames?: ReadonlyMap<string, string>;
};

type ApiRecord = Record<string, unknown>;
type ApiCategory = {
  id: string;
  name: string;
  productCount: number | null;
};

const categoryTones = ["sand", "sage", "clay", "mist"];
const defaultArts: Product["art"][] = [
  "ceramic",
  "linen",
  "bag",
  "glow",
  "wood",
  "glass",
];
const defaultColors = [
  "#d9cbb7",
  "#aebcae",
  "#d58f70",
  "#ded9d2",
  "#be8d61",
  "#b8ced0",
];

function asRecord(value: unknown): ApiRecord | null {
  return value && typeof value === "object"
    ? (value as ApiRecord)
    : null;
}

function toStringId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function readRecords(value: unknown, key: string): ApiRecord[] {
  const container = asRecord(value);
  const records = Array.isArray(value)
    ? value
    : container && Array.isArray(container[key])
      ? container[key]
      : null;

  if (!records) {
    throw new Error(`${key} API 응답 형식이 올바르지 않아요.`);
  }

  return records
    .map(asRecord)
    .filter((record): record is ApiRecord => record !== null);
}

function readProductImages(value: unknown): ProductImage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(asRecord)
    .filter((record): record is ApiRecord => record !== null)
    .reduce<ProductImage[]>((images, record) => {
      const id = toStringId(record.id);
      const imageUrl =
        typeof record.image_url === "string" ? record.image_url.trim() : "";
      const sortOrder = Number(record.sort_order);

      if (id && imageUrl && Number.isFinite(sortOrder)) {
        images.push({ id, imageUrl, sortOrder });
      }

      return images;
    }, [])
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

async function requestJson(path: string): Promise<unknown> {
  const response = await fetch(path, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${path} 데이터를 불러오지 못했어요.`);
  }

  return response.json();
}

function parseCategories(records: ApiRecord[]): ApiCategory[] {
  return records.reduce<ApiCategory[]>((categories, record) => {
    const id = toStringId(record.id);
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const productCount = Number(record.product_count);

    if (id && name) {
      categories.push({
        id,
        name,
        productCount: Number.isFinite(productCount)
          ? Math.max(0, Math.floor(productCount))
          : null,
      });
    }

    return categories;
  }, []);
}

function isProductArt(value: unknown): value is Product["art"] {
  return (
    value === "ceramic" ||
    value === "linen" ||
    value === "bag" ||
    value === "glow" ||
    value === "wood" ||
    value === "glass"
  );
}

function toProduct(
  record: ApiRecord,
  index: number,
  categoryNames: ReadonlyMap<string, string>,
): Product | null {
  const id = toStringId(record.id);
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const description =
    typeof record.description === "string" ? record.description.trim() : "";
  const price = Number(record.price);
  const stockValue = Number(record.stock);
  const stock = Number.isFinite(stockValue)
    ? Math.max(0, Math.floor(stockValue))
    : 0;
  const maxOrderQuantityValue = Number(
    record.max_order_quantity ?? record.maxOrderQuantity,
  );
  const maxOrderQuantity = Number.isFinite(maxOrderQuantityValue)
    ? Math.max(0, Math.floor(maxOrderQuantityValue))
    : stock;

  if (!id || !name || !Number.isFinite(price)) {
    return null;
  }

  const categoryId = toStringId(record.category_id ?? record.categoryId);
  const category =
    typeof record.category === "string" && record.category.trim()
      ? record.category.trim()
      : categoryId
        ? categoryNames.get(categoryId) ?? categoryId
        : "기타";
  const tag = typeof record.tag === "string" ? record.tag.trim() : undefined;
  const imageUrl =
    typeof (record.representative_image_url ?? record.image_url) === "string"
      ? String(record.representative_image_url ?? record.image_url).trim()
      : "";

  return {
    id,
    name,
    category,
    price,
    stock,
    maxOrderQuantity,
    tag: tag || undefined,
    description,
    imageUrl: imageUrl || null,
    color:
      typeof record.color === "string" && record.color.trim()
        ? record.color
        : defaultColors[index % defaultColors.length],
    art: isProductArt(record.art)
      ? record.art
      : defaultArts[index % defaultArts.length],
  };
}

function toProductDetail(
  record: ApiRecord,
  categoryNames: ReadonlyMap<string, string> = new Map(),
): ProductDetail | null {
  const product = toProduct(record, 0, categoryNames);
  const categoryId = toStringId(record.category_id ?? record.categoryId);

  if (!product || !categoryId) {
    return null;
  }

  return {
    ...product,
    categoryId,
    images: readProductImages(record.images),
  };
}

function buildCategories(
  catalogProducts: Product[],
  apiCategories: ApiCategory[] = [],
): CatalogCategory[] {
  const counts = new Map<string, number>();

  for (const product of catalogProducts) {
    counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  }

  const categories = apiCategories.length
    ? apiCategories
    : Array.from(counts.keys()).map((name) => ({
        id: name,
        name,
        productCount: null,
      }));

  return categories.map((category, index) => ({
    id: category.id,
    name: category.name,
    count: category.productCount ?? counts.get(category.name) ?? 0,
    tone: categoryTones[index % categoryTones.length],
  }));
}

export async function fetchCatalog(): Promise<CatalogData> {
  const categoriesResponse = await requestJson("/api/categories");
  const apiCategories = parseCategories(
    readRecords(categoriesResponse, "categories"),
  );
  const categoryNames = new Map(
    apiCategories.map((category) => [category.id, category.name]),
  );
  const productPage = await fetchProductPage({ categoryNames: categoryNames });

  return {
    products: productPage.products,
    categories: buildCategories(productPage.products, apiCategories),
    pagination: productPage.pagination,
  };
}

export async function fetchProductPage(
  options: ProductPageOptions = {},
): Promise<CatalogProductPage> {
  const params = new URLSearchParams();

  if (options.page !== undefined) {
    params.set("page", String(options.page));
  }

  if (options.limit !== undefined) {
    params.set("limit", String(options.limit));
  }

  if (options.categoryId) {
    params.set("category_id", options.categoryId);
  }

  if (options.search?.trim()) {
    params.set("search", options.search.trim());
  }

  if (options.sort) {
    params.set("sort", options.sort);
  }

  const query = params.toString();
  const response = await requestJson(
    query ? `/api/products?${query}` : "/api/products",
  );
  const records = readRecords(response, "products");
  const categoryNames = options.categoryNames ?? new Map<string, string>();
  const products = records
    .map((record, index) => toProduct(record, index, categoryNames))
    .filter((product): product is Product => product !== null);
  const container = asRecord(response);
  const pagination = parsePagination(container?.pagination);

  return { products, pagination };
}

function parsePagination(value: unknown): CatalogPagination {
  const record = asRecord(value);
  const page = Number(record?.page);
  const limit = Number(record?.limit);
  const totalItems = Number(record?.totalItems);
  const totalPages = Number(record?.totalPages);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    !Number.isInteger(totalItems) ||
    totalItems < 0 ||
    !Number.isInteger(totalPages) ||
    totalPages < 0 ||
    typeof record?.hasNextPage !== "boolean" ||
    typeof record?.hasPreviousPage !== "boolean"
  ) {
    throw new Error("상품 pagination 응답 형식이 올바르지 않아요.");
  }

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: record.hasNextPage,
    hasPreviousPage: record.hasPreviousPage,
  };
}

export async function fetchProductById(id: string): Promise<ProductDetail> {
  const path = `/api/products/${encodeURIComponent(id)}`;
  const response = await fetch(path, {
    cache: "no-store",
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      asRecord(result) && typeof result.message === "string"
        ? result.message
        : "상품 정보를 불러오지 못했어요.";
    throw new Error(message);
  }

  const productRecord = asRecord(result) && asRecord(result.product);
  const product = productRecord
    ? toProductDetail(productRecord)
    : null;

  if (!product) {
    throw new Error("상품 상세 응답 형식이 올바르지 않아요.");
  }

  return product;
}
