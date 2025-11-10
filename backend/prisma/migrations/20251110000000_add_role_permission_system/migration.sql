-- Migration: Add role and permission system tables and columns
-- This migration creates the necessary tables for the role-based permission system

-- 1. Create ExpiryActionType enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expiry_action_type') THEN
        CREATE TYPE expiry_action_type AS ENUM ('labeled', 'removed', 'undone');
    END IF;
END $$;

-- 2. Create admin_roles table
CREATE TABLE IF NOT EXISTS "public"."admin_roles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create admin_permissions table
CREATE TABLE IF NOT EXISTS "public"."admin_permissions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL UNIQUE,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create role_permissions table (junction table)
CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("role_id", "permission_id"),
    FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE CASCADE,
    FOREIGN KEY ("permission_id") REFERENCES "public"."admin_permissions"("id") ON DELETE CASCADE
);

-- 5. Add role_id column to admins table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'admins' 
        AND column_name = 'role_id'
    ) THEN
        ALTER TABLE "public"."admins" 
        ADD COLUMN "role_id" UUID;
        
        ALTER TABLE "public"."admins" 
        ADD CONSTRAINT "admins_role_id_fkey" 
        FOREIGN KEY ("role_id") 
        REFERENCES "public"."admin_roles"("id") 
        ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Create expiry_actions table
CREATE TABLE IF NOT EXISTS "public"."expiry_actions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "action_type" expiry_action_type NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "days_until_expiry" INTEGER NOT NULL,
    "excluded_from_check" BOOLEAN DEFAULT false,
    "previous_action_id" UUID,
    "is_undone" BOOLEAN NOT NULL DEFAULT false,
    "undone_at" TIMESTAMP(3),
    "undone_by" UUID,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE,
    FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE RESTRICT
);

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS "admin_roles_name_idx" ON "public"."admin_roles"("name");
CREATE INDEX IF NOT EXISTS "admin_roles_is_active_idx" ON "public"."admin_roles"("is_active");
CREATE INDEX IF NOT EXISTS "admin_permissions_name_idx" ON "public"."admin_permissions"("name");
CREATE INDEX IF NOT EXISTS "admin_permissions_category_idx" ON "public"."admin_permissions"("category");
CREATE INDEX IF NOT EXISTS "role_permissions_role_id_idx" ON "public"."role_permissions"("role_id");
CREATE INDEX IF NOT EXISTS "role_permissions_permission_id_idx" ON "public"."role_permissions"("permission_id");
CREATE INDEX IF NOT EXISTS "admins_role_id_idx" ON "public"."admins"("role_id");
CREATE INDEX IF NOT EXISTS "expiry_actions_product_id_idx" ON "public"."expiry_actions"("product_id");
CREATE INDEX IF NOT EXISTS "expiry_actions_admin_id_idx" ON "public"."expiry_actions"("admin_id");
CREATE INDEX IF NOT EXISTS "expiry_actions_action_type_idx" ON "public"."expiry_actions"("action_type");
CREATE INDEX IF NOT EXISTS "expiry_actions_is_undone_idx" ON "public"."expiry_actions"("is_undone");
CREATE INDEX IF NOT EXISTS "expiry_actions_created_at_idx" ON "public"."expiry_actions"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "expiry_actions_product_id_created_at_idx" ON "public"."expiry_actions"("product_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "expiry_actions_admin_id_created_at_idx" ON "public"."expiry_actions"("admin_id", "created_at" DESC);

-- 8. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_admin_roles_updated_at ON "public"."admin_roles";
CREATE TRIGGER update_admin_roles_updated_at BEFORE UPDATE ON "public"."admin_roles"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_permissions_updated_at ON "public"."admin_permissions";
CREATE TRIGGER update_admin_permissions_updated_at BEFORE UPDATE ON "public"."admin_permissions"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expiry_actions_updated_at ON "public"."expiry_actions";
CREATE TRIGGER update_expiry_actions_updated_at BEFORE UPDATE ON "public"."expiry_actions"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

