-- ===================================
-- ADD HOMEPAGE SETTINGS TO SETTINGS TABLE
-- ===================================

-- Add homepage_settings column to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS homepage_settings JSONB;

-- Add comment to column
COMMENT ON COLUMN settings.homepage_settings IS 'Homepage content settings (hero, features, how it works, CTA)';

