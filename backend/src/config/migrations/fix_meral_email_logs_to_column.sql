-- Fix email_logs table: Add missing "to" column for meral database
-- This script fixes the error: The column `to` does not exist in the current database.

-- Check if email_logs table exists and add "to" column if missing
DO $$ 
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs' 
        AND column_name = 'to'
    ) THEN
        -- Add the "to" column
        ALTER TABLE email_logs 
        ADD COLUMN "to" TEXT NOT NULL DEFAULT '';
        
        -- Update existing rows if any (set a default value)
        UPDATE email_logs 
        SET "to" = '' 
        WHERE "to" IS NULL;
        
        -- Remove default after setting values (optional, but cleaner)
        ALTER TABLE email_logs 
        ALTER COLUMN "to" DROP DEFAULT;
        
        RAISE NOTICE 'Column "to" added to email_logs table';
    ELSE
        RAISE NOTICE 'Column "to" already exists in email_logs table';
    END IF;
END $$;

-- Ensure email_status enum exists
DO $$ BEGIN
    CREATE TYPE email_status AS ENUM ('pending', 'sent', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ensure all required columns exist
DO $$ 
BEGIN
    -- Add subject column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs' 
        AND column_name = 'subject'
    ) THEN
        ALTER TABLE email_logs ADD COLUMN subject TEXT NOT NULL DEFAULT '';
        ALTER TABLE email_logs ALTER COLUMN subject DROP DEFAULT;
    END IF;
    
    -- Add template column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs' 
        AND column_name = 'template'
    ) THEN
        ALTER TABLE email_logs ADD COLUMN template TEXT NOT NULL DEFAULT '';
        ALTER TABLE email_logs ALTER COLUMN template DROP DEFAULT;
    END IF;
    
    -- Add status column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE email_logs ADD COLUMN status email_status DEFAULT 'pending';
    END IF;
    
    -- Add error column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs' 
        AND column_name = 'error'
    ) THEN
        ALTER TABLE email_logs ADD COLUMN error TEXT;
    END IF;
    
    -- Add sent_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs' 
        AND column_name = 'sent_at'
    ) THEN
        ALTER TABLE email_logs ADD COLUMN sent_at TIMESTAMP;
    END IF;
    
    -- Add metadata column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE email_logs ADD COLUMN metadata JSONB;
    END IF;
    
    -- Add created_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE email_logs ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- Add updated_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE email_logs ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Create indexes if they don't exist (only if columns exist)
DO $$ 
BEGIN
    -- Create index for "to" column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs' 
        AND column_name = 'to'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_email_logs_to ON email_logs("to");
    END IF;
    
    -- Create index for status column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs' 
        AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
    END IF;
    
    -- Create index for template column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs' 
        AND column_name = 'template'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template);
    END IF;
    
    -- Create index for created_at column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs' 
        AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
    END IF;
END $$;

-- Create or replace updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_email_logs_updated_at ON email_logs;
CREATE TRIGGER update_email_logs_updated_at
    BEFORE UPDATE ON email_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

