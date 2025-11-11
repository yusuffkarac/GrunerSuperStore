-- Create enum for stock order status
DO $$ BEGIN
  CREATE TYPE stock_order_status AS ENUM ('pending', 'ordered', 'delivered', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create stock_orders table
CREATE TABLE IF NOT EXISTS "stock_orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "admin_id" UUID NOT NULL,
  "status" stock_order_status NOT NULL DEFAULT 'pending',
  "order_quantity" INTEGER NOT NULL,
  "expected_delivery_date" DATE,
  "actual_delivery_date" DATE,
  "note" TEXT,
  "previous_order_id" UUID,
  "is_undone" BOOLEAN NOT NULL DEFAULT false,
  "undone_at" TIMESTAMP(3),
  "undone_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "stock_orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_orders_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "stock_orders_previous_order_id_fkey" FOREIGN KEY ("previous_order_id") REFERENCES "stock_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "stock_orders_undone_by_fkey" FOREIGN KEY ("undone_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_stock_orders_product_id" ON "stock_orders"("product_id");
CREATE INDEX IF NOT EXISTS "idx_stock_orders_admin_id" ON "stock_orders"("admin_id");
CREATE INDEX IF NOT EXISTS "idx_stock_orders_status" ON "stock_orders"("status");
CREATE INDEX IF NOT EXISTS "idx_stock_orders_created_at" ON "stock_orders"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_stock_orders_is_undone" ON "stock_orders"("is_undone");
CREATE INDEX IF NOT EXISTS "idx_stock_orders_product_status" ON "stock_orders"("product_id", "status");
CREATE INDEX IF NOT EXISTS "idx_stock_orders_product_undone" ON "stock_orders"("product_id", "is_undone");

