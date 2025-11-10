-- Migration: Add expiry date fields to products and expiry settings to settings table
-- This migration adds the necessary columns for expiry date management

-- 1. Add expiry_date column to products table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'expiry_date'
    ) THEN
        ALTER TABLE "public"."products" 
        ADD COLUMN "expiry_date" TIMESTAMP(3);
        
        CREATE INDEX IF NOT EXISTS "products_expiry_date_idx" ON "public"."products"("expiry_date");
    END IF;
END $$;

-- 2. Add exclude_from_expiry_check column to products table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'exclude_from_expiry_check'
    ) THEN
        ALTER TABLE "public"."products" 
        ADD COLUMN "exclude_from_expiry_check" BOOLEAN NOT NULL DEFAULT false;
        
        CREATE INDEX IF NOT EXISTS "products_exclude_from_expiry_check_expiry_date_idx" 
        ON "public"."products"("exclude_from_expiry_check", "expiry_date");
    END IF;
END $$;

-- 3. Add expiry_management_settings column to settings table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'settings' 
        AND column_name = 'expiry_management_settings'
    ) THEN
        ALTER TABLE "public"."settings" 
        ADD COLUMN "expiry_management_settings" JSONB;
    END IF;
END $$;

