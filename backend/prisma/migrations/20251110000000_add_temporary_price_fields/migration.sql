-- AlterTable
ALTER TABLE "products" ADD COLUMN "temporary_price" DECIMAL(12,2),
ADD COLUMN "temporary_price_end_date" TIMESTAMP(3);

