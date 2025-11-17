-- Add missing undo support columns to expiry_actions and align enum values

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expiry_action_type') THEN
        BEGIN
            ALTER TYPE expiry_action_type ADD VALUE IF NOT EXISTS 'labeled';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER TYPE expiry_action_type ADD VALUE IF NOT EXISTS 'removed';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER TYPE expiry_action_type ADD VALUE IF NOT EXISTS 'undone';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    ELSE
        CREATE TYPE expiry_action_type AS ENUM ('labeled', 'removed', 'undone');
    END IF;
END $$;

ALTER TABLE IF EXISTS "public"."expiry_actions"
    ADD COLUMN IF NOT EXISTS "excluded_from_check" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "previous_action_id" UUID,
    ADD COLUMN IF NOT EXISTS "is_undone" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "undone_at" TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "undone_by" UUID;

-- Ensure references exist for undo metadata
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'expiry_actions'
          AND constraint_name = 'expiry_actions_previous_action_id_fkey'
    ) THEN
        -- constraint already exists
        NULL;
    ELSE
        ALTER TABLE "public"."expiry_actions"
        ADD CONSTRAINT "expiry_actions_previous_action_id_fkey"
        FOREIGN KEY ("previous_action_id") REFERENCES "public"."expiry_actions"("id")
        ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'expiry_actions'
          AND constraint_name = 'expiry_actions_undone_by_fkey'
    ) THEN
        NULL;
    ELSE
        ALTER TABLE "public"."expiry_actions"
        ADD CONSTRAINT "expiry_actions_undone_by_fkey"
        FOREIGN KEY ("undone_by") REFERENCES "public"."admins"("id")
        ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "expiry_actions_is_undone_idx"
    ON "public"."expiry_actions"("is_undone");
CREATE INDEX IF NOT EXISTS "expiry_actions_previous_action_idx"
    ON "public"."expiry_actions"("previous_action_id");


