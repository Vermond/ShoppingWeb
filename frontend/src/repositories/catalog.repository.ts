import type { Product, ProductCategory } from "../types/catalog";

export type CatalogCategory = {
  id: string;
  name: ProductCategory;
  count: number;
  tone: string;
};

export type CatalogData = {
  products: Product[];
  categories: CatalogCategory[];
};

type ApiRecord = Record<string, unknown>;
type ApiCategory = {
  id: string;
  name: string;
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

  return records.map(asRecord).filter((record): record is ApiRecord => record !== null);
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

    if (id && name) {
      categories.push({ id, name });
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
  categoryNames: Map<string, string>,
): Product | null {
  const id = toStringId(record.id);
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const description =
    typeof record.description === "string" ? record.description.trim() : "";
  const price = Number(record.price);

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

  return {
    id,
    name,
    category,
    price,
    tag: tag || undefined,
    description,
    color:
      typeof record.color === "string" && record.color.trim()
        ? record.color
        : defaultColors[index % defaultColors.length],
    art: isProductArt(record.art)
      ? record.art
      : defaultArts[index % defaultArts.length],
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
    : Array.from(counts.keys()).map((name) => ({ id: name, name }));

  return categories.map((category, index) => ({
    id: category.id,
    name: category.name,
    count: counts.get(category.name) ?? 0,
    tone: categoryTones[index % categoryTones.length],
  }));
}

export async function fetchCatalog(): Promise<CatalogData> {
  const [categoriesResponse, productsResponse] = await Promise.all([
    requestJson("/api/categories"),
    requestJson("/api/products"),
  ]);
  const apiCategories = parseCategories(readRecords(categoriesResponse, "categories"));
  const categoryNames = new Map(
    apiCategories.map((category) => [category.id, category.name]),
  );
  const catalogProducts = readRecords(productsResponse, "products")
    .map((record, index) => toProduct(record, index, categoryNames))
    .filter((product): product is Product => product !== null);

  return {
    products: catalogProducts,
    categories: buildCategories(catalogProducts, apiCategories),
  };
}
