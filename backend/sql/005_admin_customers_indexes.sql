CREATE INDEX IF NOT EXISTS users_user_created_at_id_idx
  ON auth.users (role, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS users_user_status_created_at_id_idx
  ON auth.users (role, status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS users_user_email_verified_created_at_id_idx
  ON auth.users (role, email_verified, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS orders_user_id_status_created_at_idx
  ON sales.orders (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS order_items_order_id_id_idx
  ON sales.order_items (order_id, id ASC);
