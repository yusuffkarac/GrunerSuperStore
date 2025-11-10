-- Migration: Add emailTemplates column to settings table
-- Date: 2025-01-15

ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS email_templates JSONB;

-- Email templates will be stored as JSONB with structure:
-- {
--   "template-name": {
--     "subject": "Email subject",
--     "body": "Email body HTML"
--   }
-- }

