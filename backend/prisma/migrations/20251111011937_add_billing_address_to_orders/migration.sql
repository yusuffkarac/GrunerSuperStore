-- Add billing_address_id column to orders table
ALTER TABLE "orders" ADD COLUMN "billing_address_id" UUID;

-- Add foreign key constraint
ALTER TABLE "orders" ADD CONSTRAINT "orders_billing_address_id_fkey" FOREIGN KEY ("billing_address_id") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add index for billing_address_id
CREATE INDEX "idx_orders_billing_address_id" ON "orders"("billing_address_id") WHERE "billing_address_id" IS NOT NULL;

