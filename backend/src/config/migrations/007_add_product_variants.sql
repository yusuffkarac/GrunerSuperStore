-- Product Variants Migration
-- Bu migration ürün varyant sistemi için gerekli tabloları oluşturur

-- 1. Product Variant Options tablosu (Varyant tipleri: Renk, Beden, vb.)
CREATE TABLE IF NOT EXISTS product_variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variant_options_product_id ON product_variant_options(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_options_product_display ON product_variant_options(product_id, display_order);

-- 2. Product Variants tablosu (Her varyant: Kırmızı-S, Mavi-M, vb.)
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku TEXT UNIQUE,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_active ON product_variants(product_id, is_active);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_stock ON product_variants(stock);

-- 3. Product Variant Values tablosu (Her varyantın değerleri)
CREATE TABLE IF NOT EXISTS product_variant_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES product_variant_options(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(variant_id, option_id)
);

CREATE INDEX IF NOT EXISTS idx_product_variant_values_variant_id ON product_variant_values(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_values_option_id ON product_variant_values(option_id);

-- 4. Cart Items tablosuna variant_id ekle
ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON cart_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_product_variant ON cart_items(user_id, product_id, variant_id);

-- 5. Order Items tablosuna variant_id ve variant_name ekle
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_name TEXT;

CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);

-- Updated_at trigger fonksiyonu (eğer yoksa)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger'ları ekle
DROP TRIGGER IF EXISTS update_product_variant_options_updated_at ON product_variant_options;
CREATE TRIGGER update_product_variant_options_updated_at
  BEFORE UPDATE ON product_variant_options
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_variant_values_updated_at ON product_variant_values;
CREATE TRIGGER update_product_variant_values_updated_at
  BEFORE UPDATE ON product_variant_values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

