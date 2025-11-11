-- ===================================
-- ADD show_out_of_stock_products COLUMN TO SETTINGS TABLE
-- ===================================

-- Add show_out_of_stock_products column to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS show_out_of_stock_products BOOLEAN DEFAULT true;

-- Update existing records to have default value
UPDATE settings 
SET show_out_of_stock_products = true 
WHERE show_out_of_stock_products IS NULL;

-- Add comment to column
COMMENT ON COLUMN settings.show_out_of_stock_products IS 'Show out of stock products to customers';

