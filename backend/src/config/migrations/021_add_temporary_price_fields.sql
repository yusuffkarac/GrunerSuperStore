-- ===================================
-- ADD TEMPORARY PRICE FIELDS TO PRODUCTS TABLE
-- ===================================

-- Add temporary_price column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS temporary_price DECIMAL(12,2);

-- Add temporary_price_end_date column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS temporary_price_end_date TIMESTAMP;

-- Add comments to columns
COMMENT ON COLUMN products.temporary_price IS 'Geçici fiyat (kampanya fiyatı)';
COMMENT ON COLUMN products.temporary_price_end_date IS 'Geçici fiyatın bitiş tarihi';

