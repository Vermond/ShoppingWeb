CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
  ON auth.users (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS shipping_policy_active_unique_idx
  ON sales.shipping_policy (is_active)
  WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_default_unique_idx
  ON auth.user_addresses (user_id)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx
  ON auth.refresh_tokens (user_id, revoked_at, expires_at);

CREATE INDEX IF NOT EXISTS email_verification_tokens_hash_idx
  ON auth.email_verification_tokens (token_hash);

CREATE INDEX IF NOT EXISTS password_reset_tokens_hash_idx
  ON auth.password_reset_tokens (token_hash);

CREATE INDEX IF NOT EXISTS wishlist_items_product_id_idx
  ON wishlist.wishlist_items (product_id);
