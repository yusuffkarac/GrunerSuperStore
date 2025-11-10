-- Migration: Add OpenFoodFacts fields to products table
-- Date: 2025-11-08
-- Description: Adds ingredients_text, allergens, nutriscore_grade, ecoscore_grade, nutrition_data, and openfoodfacts_categories columns

-- Add OpenFoodFacts related columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS ingredients_text TEXT,
ADD COLUMN IF NOT EXISTS allergens JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS nutriscore_grade VARCHAR(1),
ADD COLUMN IF NOT EXISTS ecoscore_grade VARCHAR(1),
ADD COLUMN IF NOT EXISTS nutrition_data JSONB,
ADD COLUMN IF NOT EXISTS openfoodfacts_categories JSONB;

-- Add comments to columns
COMMENT ON COLUMN products.ingredients_text IS 'Ürün içerik bilgisi (OpenFoodFacts)';
COMMENT ON COLUMN products.allergens IS 'Alerjen bilgileri (JSON array)';
COMMENT ON COLUMN products.nutriscore_grade IS 'Nutri-Score değeri (a, b, c, d, e)';
COMMENT ON COLUMN products.ecoscore_grade IS 'Eco-Score değeri (a, b, c, d, e)';
COMMENT ON COLUMN products.nutrition_data IS 'Beslenme bilgileri (JSON object)';
COMMENT ON COLUMN products.openfoodfacts_categories IS 'OpenFoodFacts kategori etiketleri (JSON array)';

