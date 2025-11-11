-- ===================================
-- ADD guest_can_view_products COLUMN TO SETTINGS TABLE
-- ===================================

-- Add guest_can_view_products column to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS guest_can_view_products BOOLEAN DEFAULT true;

-- Add comment to column
COMMENT ON COLUMN settings.guest_can_view_products IS 'Allow guests to view products without login';

