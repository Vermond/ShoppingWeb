CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS cart;
CREATE SCHEMA IF NOT EXISTS sales;
CREATE SCHEMA IF NOT EXISTS wishlist;

CREATE TABLE auth.users (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  password_hash text NULL,
  "name" text NOT NULL,
  "role" text DEFAULT 'user'::text NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  email_verified boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT unique_email UNIQUE (email),
  CONSTRAINT users_role_check CHECK ("role" = ANY (
    ARRAY['user'::text, 'admin'::text]
  )),
  CONSTRAINT users_status_check CHECK (status = ANY (
    ARRAY['active'::text, 'inactive'::text, 'withdrawn'::text]
  ))
);

CREATE TABLE auth.refresh_tokens (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  last_used_at timestamptz NULL,
  CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT refresh_tokens_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE auth.email_verification_tokens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT email_verification_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE auth.password_reset_tokens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT password_reset_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE auth.user_addresses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  recipient_name text NOT NULL,
  phone_number text NOT NULL,
  postal_code text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text NULL,
  is_default boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT user_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT user_addresses_recipient_name_check CHECK (
    char_length(btrim(recipient_name)) BETWEEN 1 AND 100
  ),
  CONSTRAINT user_addresses_phone_check CHECK (
    char_length(btrim(phone_number)) BETWEEN 7 AND 30
  ),
  CONSTRAINT user_addresses_postal_code_check CHECK (
    char_length(btrim(postal_code)) BETWEEN 3 AND 20
  ),
  CONSTRAINT user_addresses_line1_check CHECK (
    char_length(btrim(address_line1)) BETWEEN 1 AND 300
  ),
  CONSTRAINT user_addresses_line2_check CHECK (
    address_line2 IS NULL OR char_length(btrim(address_line2)) <= 300
  ),
  CONSTRAINT user_addresses_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE catalog.categories (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_name_unique UNIQUE (name)
);

CREATE TABLE catalog.products (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  category_id bigint NOT NULL,
  "name" text NOT NULL,
  description text NULL,
  price numeric(12, 2) NOT NULL,
  stock integer DEFAULT 0 NOT NULL,
  max_order_quantity integer DEFAULT 1 NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_price_nonnegative CHECK (price >= 0::numeric),
  CONSTRAINT products_stock_nonnegative CHECK (stock >= 0),
  CONSTRAINT products_max_order_quantity_positive CHECK (max_order_quantity > 0),
  CONSTRAINT products_status_check CHECK (status = ANY (
    ARRAY['active'::text, 'inactive'::text, 'draft'::text, 'archived'::text]
  )),
  CONSTRAINT products_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES catalog.categories(id)
);

CREATE TABLE catalog.product_images (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  product_id uuid NOT NULL,
  image_url text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT product_images_pkey PRIMARY KEY (id),
  CONSTRAINT product_images_sort_order_nonnegative CHECK (sort_order >= 0),
  CONSTRAINT product_images_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES catalog.products(id)
);

CREATE TABLE cart.carts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT carts_pkey PRIMARY KEY (id),
  CONSTRAINT carts_user_id_unique UNIQUE (user_id),
  CONSTRAINT carts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE cart.cart_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  cart_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT cart_items_unique UNIQUE (cart_id, product_id),
  CONSTRAINT cart_items_cart_id_fkey
    FOREIGN KEY (cart_id) REFERENCES cart.carts(id) ON DELETE CASCADE,
  CONSTRAINT cart_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES catalog.products(id)
);

CREATE TABLE sales.orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  total_amount numeric(12, 2) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  subtotal numeric(12, 2) DEFAULT 0 NOT NULL,
  shipping_fee numeric(12, 2) DEFAULT 0 NOT NULL,
  discount_amount numeric(12, 2) DEFAULT 0 NOT NULL,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_status_check CHECK (status = ANY (
    ARRAY['pending'::text, 'paid'::text, 'shipped'::text,
          'completed'::text, 'cancelled'::text]
  )),
  CONSTRAINT orders_subtotal_nonnegative CHECK (subtotal >= 0::numeric),
  CONSTRAINT orders_shipping_fee_nonnegative CHECK (shipping_fee >= 0::numeric),
  CONSTRAINT orders_discount_amount_nonnegative CHECK (discount_amount >= 0::numeric),
  CONSTRAINT orders_total_amount_nonnegative CHECK (total_amount >= 0::numeric),
  CONSTRAINT orders_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE sales.order_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  unit_price numeric(12, 2) NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT order_items_unit_price_nonnegative CHECK (unit_price >= 0::numeric),
  CONSTRAINT order_items_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES sales.orders(id),
  CONSTRAINT order_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES catalog.products(id)
);

CREATE TABLE sales.order_addresses (
  order_id uuid NOT NULL,
  recipient_name text NOT NULL,
  phone_number text NOT NULL,
  postal_code text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text NULL,
  delivery_request text NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT order_addresses_pkey PRIMARY KEY (order_id),
  CONSTRAINT order_addresses_recipient_name_check CHECK (
    char_length(btrim(recipient_name)) BETWEEN 1 AND 100
  ),
  CONSTRAINT order_addresses_phone_check CHECK (
    char_length(btrim(phone_number)) BETWEEN 7 AND 30
  ),
  CONSTRAINT order_addresses_postal_code_check CHECK (
    char_length(btrim(postal_code)) BETWEEN 3 AND 20
  ),
  CONSTRAINT order_addresses_line1_check CHECK (
    char_length(btrim(address_line1)) BETWEEN 1 AND 300
  ),
  CONSTRAINT order_addresses_line2_check CHECK (
    address_line2 IS NULL OR char_length(btrim(address_line2)) <= 300
  ),
  CONSTRAINT order_addresses_delivery_request_check CHECK (
    delivery_request IS NULL OR char_length(delivery_request) <= 500
  ),
  CONSTRAINT order_addresses_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES sales.orders(id) ON DELETE CASCADE
);

CREATE TABLE sales.shipping_policy (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  base_fee numeric(12, 2) DEFAULT 3000 NOT NULL,
  free_threshold numeric(12, 2) DEFAULT 50000 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  is_active boolean DEFAULT false NOT NULL,
  CONSTRAINT shipping_policy_pkey PRIMARY KEY (id),
  CONSTRAINT shipping_policy_base_fee_nonnegative CHECK (base_fee >= 0::numeric),
  CONSTRAINT shipping_policy_free_threshold_nonnegative CHECK (
    free_threshold >= 0::numeric
  )
);

CREATE TABLE wishlist.wishlist_items (
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT wishlist_items_pkey PRIMARY KEY (user_id, product_id),
  CONSTRAINT wishlist_items_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT wishlist_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES catalog.products(id)
);
