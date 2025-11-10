-- ===================================
-- ADD EMAIL VERIFICATION TO USERS
-- ===================================

-- Add email verification columns to users table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS email_verification_code TEXT,
    ADD COLUMN IF NOT EXISTS email_verification_code_expiry TIMESTAMP;

-- Create index for email verification status
CREATE INDEX IF NOT EXISTS idx_users_is_email_verified ON users(is_email_verified);

-- Update existing users to have verified email (for backward compatibility)
UPDATE users SET is_email_verified = true WHERE is_email_verified IS NULL;

