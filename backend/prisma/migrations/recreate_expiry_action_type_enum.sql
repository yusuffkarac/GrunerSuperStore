-- Completely recreate expiry_action_type enum
-- This will fix any enum value mismatches

DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Check if column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'expiry_actions' 
        AND column_name = 'action_type'
    ) INTO col_exists;
    
    -- If column exists, drop it temporarily
    IF col_exists THEN
        ALTER TABLE expiry_actions DROP COLUMN action_type;
    END IF;
    
    -- Drop enum if it exists
    DROP TYPE IF EXISTS expiry_action_type CASCADE;
    
    -- Create enum with correct values
    CREATE TYPE expiry_action_type AS ENUM ('labeled', 'removed', 'undone');
    
    -- Re-add column if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expiry_actions') THEN
        ALTER TABLE expiry_actions ADD COLUMN action_type expiry_action_type NOT NULL DEFAULT 'labeled';
    END IF;
END $$;

