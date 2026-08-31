export type CategoryRow = {
  id: string;
  name: string;
  product_count: number;
  created_at: Date;
  updated_at: Date;
};

export type CategoryRecord = CategoryRow;

export type CategoryResponse = Omit<
  CategoryRecord,
  'created_at' | 'updated_at'
> & {
  created_at: string;
  updated_at: string;
};

export function serializeCategory(category: CategoryRecord): CategoryResponse {
  return {
    ...category,
    created_at: category.created_at.toISOString(),
    updated_at: category.updated_at.toISOString(),
  };
}
