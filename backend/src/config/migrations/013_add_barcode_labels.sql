-- Barcode labels tablosu oluşturulur
CREATE TABLE IF NOT EXISTS barcode_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    unit TEXT,
    barcode TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_barcode_labels_barcode ON barcode_labels(barcode);
CREATE INDEX IF NOT EXISTS idx_barcode_labels_name ON barcode_labels(name);
CREATE INDEX IF NOT EXISTS idx_barcode_labels_created_at ON barcode_labels(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_barcode_labels_updated_at
    BEFORE UPDATE ON barcode_labels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

