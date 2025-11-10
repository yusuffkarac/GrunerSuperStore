-- AlterTable
ALTER TABLE "orders" ADD COLUMN "cancellation_reason" TEXT,
ADD COLUMN "cancellation_internal_note" TEXT,
ADD COLUMN "cancellation_customer_message" TEXT,
ADD COLUMN "show_cancellation_reason_to_customer" BOOLEAN NOT NULL DEFAULT false;

