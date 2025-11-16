-- ===================================
-- WEEKLY MAGAZINE (PDF FLIPBOOK)
-- ===================================

CREATE TABLE IF NOT EXISTS weekly_magazines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  pdf_url VARCHAR(500) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weekly_magazines_is_active ON weekly_magazines(is_active);
CREATE INDEX IF NOT EXISTS idx_weekly_magazines_dates ON weekly_magazines(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_weekly_magazines_active_dates ON weekly_magazines(is_active, start_date, end_date);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_weekly_magazines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_weekly_magazines_updated_at
BEFORE UPDATE ON weekly_magazines
FOR EACH ROW
EXECUTE FUNCTION update_weekly_magazines_updated_at();

