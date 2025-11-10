-- Settings tablosuna theme_colors kolonu eklenir
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS theme_colors JSONB;

