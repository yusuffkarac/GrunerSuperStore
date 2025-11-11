-- Add email change fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS new_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_change_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS email_change_code_expiry TIMESTAMP(3);

