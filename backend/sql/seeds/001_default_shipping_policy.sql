INSERT INTO sales.shipping_policy (base_fee, free_threshold, is_active)
SELECT 3000.00, 50000.00, true
WHERE NOT EXISTS (
  SELECT 1
  FROM sales.shipping_policy
  WHERE is_active = true
);
