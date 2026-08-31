CREATE INDEX IF NOT EXISTS products_admin_status_created_at_id_idx
  ON catalog.products (status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS product_images_product_id_sort_order_id_idx
  ON catalog.product_images (product_id, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS order_items_product_id_idx
  ON sales.order_items (product_id);

CREATE INDEX IF NOT EXISTS orders_status_created_at_idx
  ON sales.orders (status, created_at DESC);
