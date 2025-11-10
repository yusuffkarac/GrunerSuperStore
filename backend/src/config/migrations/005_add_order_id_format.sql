-- ===================================
-- ADD ORDER_ID_FORMAT TO SETTINGS TABLE
-- ===================================

-- Add order_id_format column to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS order_id_format JSONB DEFAULT '{
  "prefix": "GS",
  "separator": "-",
  "dateFormat": "YYYYMMDD",
  "numberPadding": 4,
  "resetPeriod": "daily",
  "caseTransform": "uppercase"
}'::jsonb;

-- Add comment to column
COMMENT ON COLUMN settings.order_id_format IS 'Order ID format configuration (prefix, separator, dateFormat, numberPadding, resetPeriod, caseTransform)';
