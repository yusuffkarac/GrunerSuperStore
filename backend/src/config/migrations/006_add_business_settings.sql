-- Settings tablosuna yeni iş ayarları alanları eklenir
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS min_order_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS free_shipping_threshold DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS shipping_rules JSONB,
  ADD COLUMN IF NOT EXISTS delivery_settings JSONB,
  ADD COLUMN IF NOT EXISTS payment_options JSONB,
  ADD COLUMN IF NOT EXISTS order_limits JSONB,
  ADD COLUMN IF NOT EXISTS store_settings JSONB;


