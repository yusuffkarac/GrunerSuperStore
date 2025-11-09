-- CreateTable
CREATE TABLE "order_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_reviews_order_id_key" ON "order_reviews"("order_id");

-- CreateIndex
CREATE INDEX "order_reviews_order_id_idx" ON "order_reviews"("order_id");

-- CreateIndex
CREATE INDEX "order_reviews_user_id_idx" ON "order_reviews"("user_id");

-- CreateIndex
CREATE INDEX "order_reviews_rating_idx" ON "order_reviews"("rating");

-- CreateIndex
CREATE INDEX "order_reviews_created_at_idx" ON "order_reviews"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "order_reviews" ADD CONSTRAINT "order_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_reviews" ADD CONSTRAINT "order_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
