CREATE TABLE IF NOT EXISTS sales.order_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id uuid NOT NULL,
  previous_status text NULL,
  new_status text NOT NULL,
  changed_by uuid NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT order_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT order_status_history_previous_status_check CHECK (
    (previous_status IS NULL OR previous_status = ANY (
      ARRAY['pending'::text, 'paid'::text, 'shipped'::text,
            'completed'::text, 'cancelled'::text]
    ))
  ),
  CONSTRAINT order_status_history_new_status_check CHECK (
    new_status = ANY (
      ARRAY['pending'::text, 'paid'::text, 'shipped'::text,
            'completed'::text, 'cancelled'::text]
    )
  ),
  CONSTRAINT order_status_history_status_change_check CHECK (
    previous_status IS NULL OR previous_status <> new_status
  ),
  CONSTRAINT order_status_history_order_fk
    FOREIGN KEY (order_id) REFERENCES sales.orders(id) ON DELETE CASCADE,
  CONSTRAINT order_status_history_changed_by_fk
    FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS order_status_history_order_id_created_at_idx
  ON sales.order_status_history (order_id, created_at ASC, id ASC);
