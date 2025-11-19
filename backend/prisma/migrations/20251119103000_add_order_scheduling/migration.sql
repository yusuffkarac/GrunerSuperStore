-- AlterTable
ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "scheduled_for" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "is_preorder" BOOLEAN NOT NULL DEFAULT FALSE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_scheduled_for_idx" ON "orders"("scheduled_for");

