-- Migration: Add barcode_label_settings column to settings table
-- Date: 2025-01-XX
-- Description: Adds barcodeLabelSettings JSON column to store print label font size settings

-- Add barcode_label_settings column to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS barcode_label_settings JSONB DEFAULT '{
  "labelHeaderFontSize": 16,
  "labelPriceFontSize": 46,
  "labelPriceCurrencyFontSize": 24,
  "labelSkuFontSize": 11
}'::jsonb;

-- Add comment to column
COMMENT ON COLUMN settings.barcode_label_settings IS 'Barkod etiket yazdırma ayarları (font boyutları)';

