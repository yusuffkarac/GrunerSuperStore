-- AlterTable: Add adminId to notifications
-- Migration: add_admin_id_to_notifications

-- user_id'yi nullable yap (eğer zaten nullable değilse)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'user_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "notifications" ALTER COLUMN "user_id" DROP NOT NULL;
  END IF;
END $$;

-- admin_id kolonunu ekle (eğer yoksa)
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "admin_id" UUID;

-- Foreign key constraint ekle (eğer yoksa)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_admin_id_fkey'
  ) THEN
    ALTER TABLE "notifications" 
      ADD CONSTRAINT "notifications_admin_id_fkey" 
      FOREIGN KEY ("admin_id") 
      REFERENCES "admins"("id") 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Index ekle
CREATE INDEX IF NOT EXISTS "notifications_admin_id_idx" ON "notifications"("admin_id");
CREATE INDEX IF NOT EXISTS "notifications_admin_id_is_read_idx" ON "notifications"("admin_id", "is_read");
CREATE INDEX IF NOT EXISTS "notifications_admin_id_created_at_idx" ON "notifications"("admin_id", "created_at" DESC);

-- Check constraint: userId veya adminId'den biri olmalı (eğer yoksa)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_user_or_admin_check'
  ) THEN
    ALTER TABLE "notifications" 
      ADD CONSTRAINT "notifications_user_or_admin_check" 
      CHECK (("user_id" IS NOT NULL AND "admin_id" IS NULL) OR ("user_id" IS NULL AND "admin_id" IS NOT NULL));
  END IF;
END $$;

