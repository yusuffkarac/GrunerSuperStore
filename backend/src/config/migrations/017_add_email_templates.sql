-- Migration: Add email_templates column to settings table
-- Date: 2025-01-15
-- Description: Adds emailTemplates JSON column to store custom email templates

-- Add email_templates column to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS email_templates JSONB;

-- Add comment to column
COMMENT ON COLUMN settings.email_templates IS 'Email template''leri (subject ve body)';

