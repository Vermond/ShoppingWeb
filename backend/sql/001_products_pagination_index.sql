CREATE INDEX IF NOT EXISTS products_created_at_id_idx
ON catalog.products (created_at DESC, id DESC);
