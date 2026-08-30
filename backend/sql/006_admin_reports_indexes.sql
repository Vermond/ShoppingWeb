CREATE INDEX IF NOT EXISTS orders_report_valid_created_at_idx
  ON sales.orders (created_at DESC, id DESC)
  WHERE status IN ('paid', 'shipped', 'completed');

CREATE INDEX IF NOT EXISTS order_items_order_id_product_id_idx
  ON sales.order_items (order_id, product_id);
