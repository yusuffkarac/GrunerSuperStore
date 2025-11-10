-- Migration: Add notification_templates column to settings table
-- Date: 2025-11-09

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS notification_templates JSONB;

COMMENT ON COLUMN settings.notification_templates IS 'Notification template''leri (title ve message)';

