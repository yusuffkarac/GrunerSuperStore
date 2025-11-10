-- ===================================
-- ADD SHOW_STOCK COLUMN TO PRODUCTS TABLE
-- ===================================

-- Add show_stock column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS show_stock BOOLEAN NOT NULL DEFAULT false;

-- Add comment to column
COMMENT ON COLUMN products.show_stock IS 'Whether to show stock quantity to customers';

