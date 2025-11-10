-- Campaigns Migration
-- Bu migration kampanya sistemi için gerekli tabloyu oluşturur

-- 1. Campaign Type Enum
DO $$ BEGIN
    CREATE TYPE campaign_type AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y', 'FREE_SHIPPING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Campaigns tablosu
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,

  -- Kampanya tipi
  type campaign_type NOT NULL,

  -- İndirim değerleri
  discount_percent DECIMAL(5, 2),  -- %50.00 gibi
  discount_amount DECIMAL(12, 2),  -- 10.00€ gibi

  -- X Al Y Öde için
  buy_quantity INTEGER,   -- Örn: 3 (3 al)
  get_quantity INTEGER,   -- Örn: 2 (2 öde)

  -- Tarih aralığı
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,

  -- Uygulama kuralları
  min_purchase DECIMAL(12, 2),   -- Min sepet tutarı
  max_discount DECIMAL(12, 2),   -- Max indirim tutarı
  usage_limit INTEGER,            -- Toplam kullanım limiti
  usage_count INTEGER NOT NULL DEFAULT 0,  -- Kullanım sayısı

  -- Hedefleme
  apply_to_all BOOLEAN NOT NULL DEFAULT false,  -- Tüm mağaza
  category_ids JSONB,  -- ["uuid1", "uuid2"]
  product_ids JSONB,   -- ["uuid1", "uuid2"]

  -- Durumlar
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,  -- Yüksek öncelik önce uygulanır

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_is_active ON campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_active_priority ON campaigns(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_campaigns_apply_all_active ON campaigns(apply_to_all, is_active);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

