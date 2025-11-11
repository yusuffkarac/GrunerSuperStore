-- ===================================
-- GRUNER SUPERSTORE - INITIAL SCHEMA
-- Database: PostgreSQL 14+
-- ===================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================
-- ENUMS
-- ===================================

CREATE TYPE order_type AS ENUM ('pickup', 'delivery');
CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'preparing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE payment_type AS ENUM ('none', 'cash', 'card_on_delivery');

-- ===================================
-- TRIGGER FUNCTION FOR updated_at
-- ===================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ===================================
-- TABLES
-- ===================================

-- 1) USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- 2) ADDRESSES (Germany-specific)
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,                    -- e.g., "Zuhause", "Arbeit"
    street TEXT NOT NULL,                   -- Straßenname
    house_number TEXT NOT NULL,             -- Hausnummer z.B. "12A"
    address_line2 TEXT,                     -- Zusatz (Etage, Wohnung)
    district TEXT,                          -- Stadtteil
    postal_code TEXT NOT NULL,              -- PLZ (5 digits)
    city TEXT NOT NULL,                     -- Stadt
    state TEXT NOT NULL,                    -- Bundesland
    description TEXT,                       -- Lieferhinweise
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT postal_code_format CHECK (postal_code ~* '^\d{5}$')
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_postal_code ON addresses(postal_code);
CREATE INDEX idx_addresses_city ON addresses(city);
CREATE INDEX idx_addresses_state ON addresses(state);
CREATE INDEX idx_addresses_is_default ON addresses(user_id, is_default) WHERE is_default = true;

-- 3) CATEGORIES
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    image_url TEXT,
    sort_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_categories_sort_order ON categories(sort_order) WHERE sort_order IS NOT NULL;

-- 4) PRODUCTS
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(12,2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    low_stock_level INTEGER DEFAULT 10,
    unit TEXT,                              -- kg, Stück, Liter, etc.
    barcode TEXT,
    brand TEXT,
    image_urls JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT price_positive CHECK (price >= 0),
    CONSTRAINT stock_non_negative CHECK (stock >= 0),
    CONSTRAINT low_stock_positive CHECK (low_stock_level IS NULL OR low_stock_level >= 0)
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_brand ON products(brand) WHERE brand IS NOT NULL;
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_is_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_stock ON products(stock);
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- 5) CART_ITEMS
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT quantity_positive CHECK (quantity > 0),
    CONSTRAINT unique_user_product UNIQUE (user_id, product_id)
);

CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);

-- 6) ORDERS
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    order_no TEXT NOT NULL UNIQUE,
    type order_type NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    address_id UUID REFERENCES addresses(id) ON DELETE RESTRICT,
    delivery_fee NUMERIC(12,2) DEFAULT 0,
    subtotal NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    payment_type payment_type DEFAULT 'none',
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT delivery_fee_non_negative CHECK (delivery_fee >= 0),
    CONSTRAINT subtotal_non_negative CHECK (subtotal >= 0),
    CONSTRAINT total_non_negative CHECK (total >= 0),
    CONSTRAINT delivery_needs_address CHECK (
        (type = 'pickup' AND address_id IS NULL) OR
        (type = 'delivery' AND address_id IS NOT NULL)
    )
);

CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_orders_user_id_created_at ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_type ON orders(type);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_address_id ON orders(address_id) WHERE address_id IS NOT NULL;

-- 7) ORDER_ITEMS (snapshot at time of order)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,             -- Snapshot
    price NUMERIC(12,2) NOT NULL,           -- Unit price at order time
    quantity INTEGER NOT NULL,
    unit TEXT,                              -- Snapshot
    brand TEXT,                             -- Snapshot
    image_url TEXT,                         -- Single image snapshot
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT item_quantity_positive CHECK (quantity > 0),
    CONSTRAINT item_price_non_negative CHECK (price >= 0)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- 8) FAVORITES
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_user_product_favorite UNIQUE (user_id, product_id)
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_product_id ON favorites(product_id);
CREATE INDEX idx_favorites_created_at ON favorites(created_at DESC);

-- 9) DELIVERY_ZONES
CREATE TABLE delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    minimum_amount NUMERIC(12,2),           -- Mindestbestellwert für kostenlose Lieferung
    delivery_fee NUMERIC(12,2) NOT NULL,
    estimated_time INTEGER NOT NULL,        -- Minuten
    max_distance_km NUMERIC(6,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT delivery_fee_non_negative CHECK (delivery_fee >= 0),
    CONSTRAINT minimum_amount_positive CHECK (minimum_amount IS NULL OR minimum_amount >= 0),
    CONSTRAINT max_distance_positive CHECK (max_distance_km IS NULL OR max_distance_km > 0),
    CONSTRAINT estimated_time_positive CHECK (estimated_time > 0)
);

CREATE INDEX idx_delivery_zones_is_active ON delivery_zones(is_active);
CREATE INDEX idx_delivery_zones_minimum_amount ON delivery_zones(minimum_amount) WHERE minimum_amount IS NOT NULL;
CREATE INDEX idx_delivery_zones_max_distance ON delivery_zones(max_distance_km) WHERE max_distance_km IS NOT NULL;

-- 10) ADMINS
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT email_format_admin CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_role CHECK (role IN ('admin', 'superadmin'))
);

CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_role ON admins(role);

-- 11) SETTINGS
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_can_view_products BOOLEAN DEFAULT true,
    show_out_of_stock_products BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_settings_created_at ON settings(created_at DESC);

-- Insert default settings record
INSERT INTO settings (id, guest_can_view_products, show_out_of_stock_products) 
VALUES (gen_random_uuid(), true, true);

-- ===================================
-- APPLY updated_at TRIGGERS
-- ===================================

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_favorites_updated_at BEFORE UPDATE ON favorites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_zones_updated_at BEFORE UPDATE ON delivery_zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- ADDITIONAL PERFORMANCE ENHANCEMENTS
-- ===================================

-- Composite index for common order queries
CREATE INDEX idx_orders_user_status_created ON orders(user_id, status, created_at DESC);

-- Index for low stock queries
CREATE INDEX idx_products_low_stock ON products(stock) WHERE stock <= low_stock_level AND is_active = true;

-- Index for active featured products
CREATE INDEX idx_products_featured_active ON products(is_featured, is_active)
    WHERE is_featured = true AND is_active = true;

-- ===================================
-- COMMENTS FOR DOCUMENTATION
-- ===================================

COMMENT ON TABLE users IS 'Registered customers';
COMMENT ON TABLE addresses IS 'German address schema with PLZ, Bundesland, etc.';
COMMENT ON TABLE categories IS 'Product categories';
COMMENT ON TABLE products IS 'Product catalog with inventory';
COMMENT ON TABLE cart_items IS 'Shopping cart (per user)';
COMMENT ON TABLE orders IS 'Customer orders (pickup or delivery)';
COMMENT ON TABLE order_items IS 'Order line items with snapshot data';
COMMENT ON TABLE favorites IS 'User favorite products';
COMMENT ON TABLE delivery_zones IS 'Delivery zones with fees and coverage';
COMMENT ON TABLE admins IS 'Admin users for management panel';

COMMENT ON COLUMN addresses.postal_code IS 'German PLZ (5 digits)';
COMMENT ON COLUMN addresses.state IS 'Bundesland';
COMMENT ON COLUMN products.image_urls IS 'Array of image URLs stored as JSONB';
COMMENT ON COLUMN orders.order_no IS 'Human-readable order number';
COMMENT ON COLUMN order_items.product_name IS 'Snapshot of product name at order time';
COMMENT ON COLUMN delivery_zones.minimum_amount IS 'Minimum order for free delivery';
