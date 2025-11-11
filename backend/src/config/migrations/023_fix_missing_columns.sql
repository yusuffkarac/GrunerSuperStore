-- ===================================
-- FIX MISSING COLUMNS IN MERAL DATABASE
-- Run this script to add all missing columns
-- ===================================

-- Settings table missing columns
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS guest_can_view_products BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_out_of_stock_products BOOLEAN DEFAULT true;

-- Products table missing columns
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS temporary_price DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS temporary_price_end_date TIMESTAMP;

-- Update existing records
UPDATE settings 
SET guest_can_view_products = true 
WHERE guest_can_view_products IS NULL;

UPDATE settings 
SET show_out_of_stock_products = true 
WHERE show_out_of_stock_products IS NULL;

-- Add comments
COMMENT ON COLUMN settings.guest_can_view_products IS 'Allow guests to view products without login';
COMMENT ON COLUMN settings.show_out_of_stock_products IS 'Show out of stock products to customers';
COMMENT ON COLUMN products.temporary_price IS 'Geçici fiyat (kampanya fiyatı)';
COMMENT ON COLUMN products.temporary_price_end_date IS 'Geçici fiyatın bitiş tarihi';

-- Mark migrations as executed (if schema_migrations table exists)
INSERT INTO schema_migrations (filename, executed_at, success) 
VALUES 
  ('020_add_guest_can_view_products.sql', NOW(), true),
  ('021_add_temporary_price_fields.sql', NOW(), true),
  ('022_add_show_out_of_stock_products.sql', NOW(), true)
ON CONFLICT (filename) DO NOTHING;

