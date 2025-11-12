-- Add name column to supplier_emails table
ALTER TABLE "supplier_emails" 
ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);

-- Create index for name if needed (optional, for search purposes)
CREATE INDEX IF NOT EXISTS "idx_supplier_emails_name" ON "supplier_emails"("name");

