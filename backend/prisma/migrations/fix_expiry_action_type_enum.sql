-- Fix expiry_action_type enum
-- Drop and recreate enum if it exists with wrong values

DO $$
BEGIN
    -- Drop enum if it exists (cascade to drop dependent columns)
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expiry_action_type') THEN
        -- First drop dependent columns
        ALTER TABLE IF EXISTS expiry_actions DROP COLUMN IF EXISTS action_type;
        -- Then drop enum
        DROP TYPE IF EXISTS expiry_action_type CASCADE;
    END IF;
    
    -- Create enum with correct values
    CREATE TYPE expiry_action_type AS ENUM ('labeled', 'removed', 'undone');
    
    -- Re-add column if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expiry_actions') THEN
        ALTER TABLE expiry_actions ADD COLUMN action_type expiry_action_type NOT NULL DEFAULT 'labeled';
    END IF;
END $$;

