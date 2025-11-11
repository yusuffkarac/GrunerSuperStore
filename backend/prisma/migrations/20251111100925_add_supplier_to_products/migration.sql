-- Add supplier column to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "supplier" VARCHAR(255);

-- Add index for supplier
CREATE INDEX IF NOT EXISTS "idx_products_supplier" ON "products"("supplier") WHERE "supplier" IS NOT NULL;

