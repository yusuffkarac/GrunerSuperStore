-- ===================================
-- FIX MERAL DATABASE - Add missing tables and columns
-- ===================================

-- 1. Create settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_can_view_products BOOLEAN DEFAULT true,
    show_out_of_stock_products BOOLEAN DEFAULT true,
    homepage_settings JSONB,
    order_id_format JSONB,
    theme_colors JSONB,
    min_order_amount DECIMAL(12,2),
    free_shipping_threshold DECIMAL(12,2),
    shipping_rules JSONB,
    delivery_settings JSONB,
    payment_options JSONB,
    order_limits JSONB,
    store_settings JSONB,
    smtp_settings JSONB,
    email_notification_settings JSONB,
    email_templates JSONB,
    notification_templates JSONB,
    barcode_label_settings JSONB,
    customer_cancellation_settings JSONB,
    expiry_management_settings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settings_created_at ON settings(created_at DESC);

-- Insert default settings if not exists
INSERT INTO settings (id, guest_can_view_products, show_out_of_stock_products) 
SELECT gen_random_uuid(), true, true
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);

-- 2. Add missing columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS show_stock BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS supplier TEXT,
ADD COLUMN IF NOT EXISTS temporary_price DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS temporary_price_end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS ingredients_text TEXT,
ADD COLUMN IF NOT EXISTS allergens JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS nutriscore_grade TEXT,
ADD COLUMN IF NOT EXISTS ecoscore_grade TEXT,
ADD COLUMN IF NOT EXISTS nutrition_data JSONB,
ADD COLUMN IF NOT EXISTS openfoodfacts_categories JSONB,
ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS exclude_from_expiry_check BOOLEAN DEFAULT false;

-- 3. Create trigger for settings updated_at if not exists
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Verify
SELECT 
  'settings' as table_name,
  COUNT(*) as row_count
FROM settings
UNION ALL
SELECT 
  'products' as table_name,
  COUNT(*) as row_count
FROM products;

