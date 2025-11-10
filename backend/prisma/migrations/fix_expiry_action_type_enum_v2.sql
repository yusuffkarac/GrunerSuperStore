-- Fix expiry_action_type enum values
-- This script ensures the enum has the correct values

DO $$
BEGIN
    -- Check if enum exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expiry_action_type') THEN
        -- Check if 'labeled' value exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e 
            JOIN pg_type t ON e.enumtypid = t.oid 
            WHERE t.typname = 'expiry_action_type' AND e.enumlabel = 'labeled'
        ) THEN
            -- Add missing enum values
            ALTER TYPE expiry_action_type ADD VALUE IF NOT EXISTS 'labeled';
            ALTER TYPE expiry_action_type ADD VALUE IF NOT EXISTS 'removed';
            ALTER TYPE expiry_action_type ADD VALUE IF NOT EXISTS 'undone';
        END IF;
    ELSE
        -- Create enum if it doesn't exist
        CREATE TYPE expiry_action_type AS ENUM ('labeled', 'removed', 'undone');
        
        -- Add column if table exists but column doesn't
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expiry_actions') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'expiry_actions' AND column_name = 'action_type'
            ) THEN
                ALTER TABLE expiry_actions ADD COLUMN action_type expiry_action_type NOT NULL DEFAULT 'labeled';
            END IF;
        END IF;
    END IF;
END $$;

