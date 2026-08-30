import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type DatabaseQueryExecutor,
} from '../database/database.service';
import type {
  AdminProductCreateInput,
  AdminProductImageInput,
  AdminProductListQuery,
  AdminProductUpdateInput,
} from './admin-products.input';
import type {
  AdminProductCountRow,
  AdminProductDetailRow,
  AdminProductListRepositoryResult,
  AdminProductListRow,
  AdminProductStatusCountRow,
} from './admin-products.types';
import {
  PRODUCT_STATUSES,
  type ProductImageRow,
  type ProductStatus,
} from '../products/products.types';

export class AdminProductNotFoundError extends Error {
  constructor() {
    super('상품을 찾을 수 없습니다.');
  }
}

export class AdminProductCategoryNotFoundError extends Error {
  constructor() {
    super('카테고리를 찾을 수 없습니다.');
  }
}

const PRODUCT_FILTERS = `
  WHERE ($1::text IS NULL OR p.name ILIKE '%' || $1 || '%')
    AND ($2::bigint IS NULL OR p.category_id = $2)
    AND ($3::text IS NULL OR p.status = $3)
    AND ($4::int IS NULL OR p.stock <= $4)
`;

const PRODUCT_FILTERS_WITHOUT_STATUS = `
  WHERE ($1::text IS NULL OR p.name ILIKE '%' || $1 || '%')
    AND ($2::bigint IS NULL OR p.category_id = $2)
    AND ($4::int IS NULL OR p.stock <= $4)
`;

const SALES_QUANTITY_JOIN = `
  LEFT JOIN (
    SELECT
      oi.product_id,
      COALESCE(SUM(oi.quantity), 0)::int AS sales_quantity
    FROM sales.order_items AS oi
    INNER JOIN sales.orders AS o
      ON o.id = oi.order_id
    WHERE o.status IN ('paid', 'shipped', 'completed')
    GROUP BY oi.product_id
  ) AS sales
    ON sales.product_id = p.id
`;

const FIND_ADMIN_PRODUCTS_QUERY_BASE = `
  SELECT
    p.id,
    p.category_id::text AS category_id,
    c.name AS category_name,
    p.name,
    representative.image_url AS representative_image_url,
    p.price,
    p.stock,
    p.max_order_quantity,
    COALESCE(sales.sales_quantity, 0)::int AS sales_quantity,
    p.status,
    p.created_at,
    p.updated_at
  FROM catalog.products AS p
  INNER JOIN catalog.categories AS c
    ON c.id = p.category_id
${SALES_QUANTITY_JOIN}
  LEFT JOIN LATERAL (
    SELECT pi.image_url
    FROM catalog.product_images AS pi
    WHERE pi.product_id = p.id
    ORDER BY pi.sort_order ASC, pi.id ASC
    LIMIT 1
  ) AS representative ON true
${PRODUCT_FILTERS}
`;

const COUNT_ADMIN_PRODUCTS_QUERY = `
  SELECT COUNT(*)::int AS total_count
  FROM catalog.products AS p
${PRODUCT_FILTERS}
`;

const COUNT_ADMIN_PRODUCTS_BY_STATUS_QUERY = `
  SELECT p.status, COUNT(*)::int AS count
  FROM catalog.products AS p
${PRODUCT_FILTERS_WITHOUT_STATUS}
  GROUP BY p.status
`;

const FIND_ADMIN_PRODUCT_QUERY = `
  SELECT
    p.id,
    p.category_id::text AS category_id,
    c.name AS category_name,
    p.name,
    p.description,
    p.price,
    p.stock,
    p.max_order_quantity,
    COALESCE(sales.sales_quantity, 0)::int AS sales_quantity,
    p.status,
    p.created_at,
    p.updated_at
  FROM catalog.products AS p
  INNER JOIN catalog.categories AS c
    ON c.id = p.category_id
${SALES_QUANTITY_JOIN}
  WHERE p.id = $1
`;

const FIND_ADMIN_PRODUCT_IMAGES_QUERY = `
  SELECT id, product_id, image_url, sort_order, created_at
  FROM catalog.product_images
  WHERE product_id = $1
  ORDER BY sort_order ASC, id ASC
`;

const FIND_ADMIN_PRODUCT_FOR_UPDATE_QUERY = `
  SELECT id, category_id::text AS category_id, name, description, price,
         stock, max_order_quantity, status, created_at, updated_at
  FROM catalog.products
  WHERE id = $1
  FOR UPDATE
`;

const FIND_CATEGORY_QUERY = `
  SELECT id
  FROM catalog.categories
  WHERE id = $1
`;

const CREATE_ADMIN_PRODUCT_QUERY = `
  INSERT INTO catalog.products (
    category_id, name, description, price, stock, max_order_quantity, status
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING id
`;

const UPDATE_ADMIN_PRODUCT_QUERY = `
  UPDATE catalog.products
  SET category_id = $2,
      name = $3,
      description = $4,
      price = $5,
      stock = $6,
      max_order_quantity = $7,
      status = $8,
      updated_at = now()
  WHERE id = $1
  RETURNING id
`;

const UPDATE_ADMIN_PRODUCT_STOCK_QUERY = `
  UPDATE catalog.products
  SET stock = $2,
      updated_at = now()
  WHERE id = $1
  RETURNING id
`;

const DELETE_ADMIN_PRODUCT_IMAGES_QUERY = `
  DELETE FROM catalog.product_images
  WHERE product_id = $1
`;

const INSERT_ADMIN_PRODUCT_IMAGE_QUERY = `
  INSERT INTO catalog.product_images (product_id, image_url, sort_order)
  VALUES ($1, $2, $3)
`;

type AdminProductForUpdateRow = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  max_order_quantity: number;
  status: string;
  created_at: Date;
  updated_at: Date;
};

type ProductIdRow = { id: string };

@Injectable()
export class AdminProductsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findPage(
    query: AdminProductListQuery,
  ): Promise<AdminProductListRepositoryResult> {
    const values = [
      query.search,
      query.categoryId,
      query.status,
      query.lowStockThreshold,
    ];
    const offset = (query.page - 1) * query.pageSize;
    const listQuery = `${FIND_ADMIN_PRODUCTS_QUERY_BASE}  ORDER BY ${getSortSql(query.sort)}\n  LIMIT $5\n  OFFSET $6\n`;

    return this.databaseService.transaction(async (executor) => {
      const [productsResult, countResult, statusCountsResult] =
        await Promise.all([
          executor.query<AdminProductListRow>(listQuery, [
            ...values,
            query.pageSize,
            offset,
          ]),
          executor.query<AdminProductCountRow>(
            COUNT_ADMIN_PRODUCTS_QUERY,
            values,
          ),
          executor.query<AdminProductStatusCountRow>(
            COUNT_ADMIN_PRODUCTS_BY_STATUS_QUERY,
            values,
          ),
        ]);

      return {
        rows: productsResult.rows,
        totalCount: countResult.rows[0]?.total_count ?? 0,
        statusCounts: toStatusCounts(statusCountsResult.rows),
      };
    });
  }

  async findById(
    id: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<AdminProductDetailRow | null> {
    const result = await executor.query<AdminProductDetailRow>(
      FIND_ADMIN_PRODUCT_QUERY,
      [id],
    );
    const product = result.rows[0];

    if (!product) {
      return null;
    }

    const imagesResult = await executor.query<ProductImageRow>(
      FIND_ADMIN_PRODUCT_IMAGES_QUERY,
      [id],
    );

    return { ...product, images: imagesResult.rows };
  }

  async create(input: AdminProductCreateInput): Promise<AdminProductDetailRow> {
    return this.databaseService.transaction(async (executor) => {
      await this.ensureCategoryExists(input.category_id, executor);

      const result = await executor.query<ProductIdRow>(
        CREATE_ADMIN_PRODUCT_QUERY,
        [
          input.category_id,
          input.name,
          input.description,
          input.price,
          input.stock,
          input.max_order_quantity,
          input.status,
        ],
      );
      const productId = result.rows[0]?.id;

      if (!productId) {
        throw new Error('상품 생성 결과를 확인할 수 없습니다.');
      }

      await replaceImages(productId, input.images, executor);
      const product = await this.findById(productId, executor);

      if (!product) {
        throw new Error('생성된 상품을 조회하지 못했습니다.');
      }

      return product;
    });
  }

  async update(
    id: string,
    input: AdminProductUpdateInput,
  ): Promise<AdminProductDetailRow> {
    return this.databaseService.transaction(async (executor) => {
      const current = await this.findForUpdate(id, executor);

      if (!current) {
        throw new AdminProductNotFoundError();
      }

      const next = {
        category_id: input.category_id ?? current.category_id,
        name: input.name ?? current.name,
        description:
          input.description !== undefined
            ? input.description
            : current.description,
        price: input.price ?? current.price,
        stock: input.stock ?? current.stock,
        max_order_quantity:
          input.max_order_quantity ?? current.max_order_quantity,
        status: input.status ?? current.status,
      };

      await this.ensureCategoryExists(next.category_id, executor);

      const result = await executor.query<ProductIdRow>(
        UPDATE_ADMIN_PRODUCT_QUERY,
        [
          id,
          next.category_id,
          next.name,
          next.description,
          next.price,
          next.stock,
          next.max_order_quantity,
          next.status,
        ],
      );

      if (!result.rows[0]) {
        throw new AdminProductNotFoundError();
      }

      if (input.images !== undefined) {
        await replaceImages(id, input.images, executor);
      }

      const product = await this.findById(id, executor);

      if (!product) {
        throw new Error('수정된 상품을 조회하지 못했습니다.');
      }

      return product;
    });
  }

  async updateStock(id: string, stock: number): Promise<AdminProductDetailRow> {
    return this.databaseService.transaction(async (executor) => {
      const current = await this.findForUpdate(id, executor);

      if (!current) {
        throw new AdminProductNotFoundError();
      }

      const result = await executor.query<ProductIdRow>(
        UPDATE_ADMIN_PRODUCT_STOCK_QUERY,
        [id, stock],
      );

      if (!result.rows[0]) {
        throw new AdminProductNotFoundError();
      }

      const product = await this.findById(id, executor);

      if (!product) {
        throw new Error('수정된 상품을 조회하지 못했습니다.');
      }

      return product;
    });
  }

  private async findForUpdate(
    id: string,
    executor: DatabaseQueryExecutor,
  ): Promise<AdminProductForUpdateRow | null> {
    const result = await executor.query<AdminProductForUpdateRow>(
      FIND_ADMIN_PRODUCT_FOR_UPDATE_QUERY,
      [id],
    );

    return result.rows[0] ?? null;
  }

  private async ensureCategoryExists(
    categoryId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<void> {
    const result = await executor.query<ProductIdRow>(FIND_CATEGORY_QUERY, [
      categoryId,
    ]);

    if (!result.rows[0]) {
      throw new AdminProductCategoryNotFoundError();
    }
  }
}

async function replaceImages(
  productId: string,
  images: AdminProductImageInput[],
  executor: DatabaseQueryExecutor,
): Promise<void> {
  await executor.query(DELETE_ADMIN_PRODUCT_IMAGES_QUERY, [productId]);

  for (const image of images) {
    await executor.query(INSERT_ADMIN_PRODUCT_IMAGE_QUERY, [
      productId,
      image.image_url,
      image.sort_order,
    ]);
  }
}

function getSortSql(sort: AdminProductListQuery['sort']): string {
  switch (sort) {
    case 'created_at_desc':
      return 'p.created_at DESC, p.id DESC';
    case 'created_at_asc':
      return 'p.created_at ASC, p.id ASC';
    case 'price_desc':
      return 'p.price DESC, p.id DESC';
    case 'price_asc':
      return 'p.price ASC, p.id ASC';
    case 'stock_asc':
      return 'p.stock ASC, p.id ASC';
    case 'stock_desc':
      return 'p.stock DESC, p.id DESC';
    case 'sales_desc':
      return 'COALESCE(sales.sales_quantity, 0) DESC, p.id DESC';
    case 'sales_asc':
      return 'COALESCE(sales.sales_quantity, 0) ASC, p.id ASC';
  }
}

function toStatusCounts(
  rows: AdminProductStatusCountRow[],
): Record<ProductStatus, number> {
  const counts = Object.fromEntries(
    PRODUCT_STATUSES.map((status) => [status, 0]),
  ) as Record<ProductStatus, number>;

  for (const row of rows) {
    if ((PRODUCT_STATUSES as readonly string[]).includes(row.status)) {
      counts[row.status as ProductStatus] = row.count;
    }
  }

  return counts;
}
