-- ===================================
-- ADD TAX_RATE COLUMN TO PRODUCTS TABLE
-- ===================================

-- Add tax_rate column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2);

-- Add comment to column
COMMENT ON COLUMN products.tax_rate IS 'Vergi oranı (örn: 19.00 = %19)';

