-- Add order_list_id and order_unit columns to stock_orders table
ALTER TABLE "stock_orders" 
ADD COLUMN IF NOT EXISTS "order_list_id" UUID,
ADD COLUMN IF NOT EXISTS "order_unit" VARCHAR(50);

-- Create stock_order_lists table
CREATE TABLE IF NOT EXISTS "stock_order_lists" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "note" TEXT,
  "supplier_email" VARCHAR(255),
  "send_to_admins" BOOLEAN NOT NULL DEFAULT false,
  "send_to_supplier" BOOLEAN NOT NULL DEFAULT false,
  "admin_id" UUID NOT NULL,
  "status" stock_order_status NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "stock_order_lists_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create supplier_emails table
CREATE TABLE IF NOT EXISTS "supplier_emails" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "supplier_emails_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Add foreign key constraint for order_list_id
ALTER TABLE "stock_orders"
ADD CONSTRAINT "stock_orders_order_list_id_fkey" 
FOREIGN KEY ("order_list_id") REFERENCES "stock_order_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for stock_order_lists
CREATE INDEX IF NOT EXISTS "idx_stock_order_lists_admin_id" ON "stock_order_lists"("admin_id");
CREATE INDEX IF NOT EXISTS "idx_stock_order_lists_status" ON "stock_order_lists"("status");
CREATE INDEX IF NOT EXISTS "idx_stock_order_lists_created_at" ON "stock_order_lists"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_stock_order_lists_status_created_at" ON "stock_order_lists"("status", "created_at" DESC);

-- Create indexes for supplier_emails
CREATE INDEX IF NOT EXISTS "idx_supplier_emails_email" ON "supplier_emails"("email");
CREATE INDEX IF NOT EXISTS "idx_supplier_emails_created_by" ON "supplier_emails"("created_by");
CREATE INDEX IF NOT EXISTS "idx_supplier_emails_created_at" ON "supplier_emails"("created_at" DESC);

-- Create index for order_list_id in stock_orders
CREATE INDEX IF NOT EXISTS "idx_stock_orders_order_list_id" ON "stock_orders"("order_list_id");

