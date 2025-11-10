-- CreateTable
CREATE TABLE "product_task_ignores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_task_ignores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_task_ignores_product_id_idx" ON "product_task_ignores"("product_id");

-- CreateIndex
CREATE INDEX "product_task_ignores_category_idx" ON "product_task_ignores"("category");

-- CreateIndex
CREATE INDEX "product_task_ignores_product_id_category_idx" ON "product_task_ignores"("product_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "product_task_ignores_product_id_category_key" ON "product_task_ignores"("product_id", "category");

-- AddForeignKey
ALTER TABLE "product_task_ignores" ADD CONSTRAINT "product_task_ignores_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Make price nullable
ALTER TABLE "products" ALTER COLUMN "price" DROP NOT NULL;

-- AlterTable: Make stock nullable (remove default)
ALTER TABLE "products" ALTER COLUMN "stock" DROP NOT NULL, ALTER COLUMN "stock" DROP DEFAULT;

