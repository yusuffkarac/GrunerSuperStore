-- AlterTable
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "customer_cancellation_settings" JSONB;

