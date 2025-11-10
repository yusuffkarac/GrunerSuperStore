-- Settings tablosuna email ayarları kolonları eklenir
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS smtp_settings JSONB,
  ADD COLUMN IF NOT EXISTS email_notification_settings JSONB;

