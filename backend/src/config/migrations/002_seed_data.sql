-- ===================================
-- GRUNER SUPERSTORE - SEED DATA
-- Germany-focused sample data
-- ===================================

-- ===================================
-- 1) CATEGORIES
-- ===================================

INSERT INTO categories (id, name, slug, image_url, sort_order, is_active) VALUES
(gen_random_uuid(), 'Obst & Gemüse', 'obst-gemuese', 'https://images.unsplash.com/photo-1610832958506-aa56368176cf', 1, true),
(gen_random_uuid(), 'Milchprodukte', 'milchprodukte', 'https://images.unsplash.com/photo-1628088062854-d1870b4553da', 2, true),
(gen_random_uuid(), 'Getränke', 'getraenke', 'https://images.unsplash.com/photo-1523362628745-0c100150b504', 3, true),
(gen_random_uuid(), 'Brot & Backwaren', 'brot-backwaren', 'https://images.unsplash.com/photo-1509440159596-0249088772ff', 4, true),
(gen_random_uuid(), 'Fleisch & Wurst', 'fleisch-wurst', 'https://images.unsplash.com/photo-1607623488235-f690e91b30b4', 5, true),
(gen_random_uuid(), 'Snacks & Süßigkeiten', 'snacks-suessigkeiten', 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60', 6, true);

-- Store category IDs for reference
DO $$
DECLARE
    cat_obst_gemuese UUID;
    cat_milch UUID;
    cat_getraenke UUID;
    cat_brot UUID;
    cat_fleisch UUID;
    cat_snacks UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO cat_obst_gemuese FROM categories WHERE slug = 'obst-gemuese';
    SELECT id INTO cat_milch FROM categories WHERE slug = 'milchprodukte';
    SELECT id INTO cat_getraenke FROM categories WHERE slug = 'getraenke';
    SELECT id INTO cat_brot FROM categories WHERE slug = 'brot-backwaren';
    SELECT id INTO cat_fleisch FROM categories WHERE slug = 'fleisch-wurst';
    SELECT id INTO cat_snacks FROM categories WHERE slug = 'snacks-suessigkeiten';

    -- ===================================
    -- 2) PRODUCTS (Obst & Gemüse)
    -- ===================================
    INSERT INTO products (category_id, name, slug, description, price, stock, low_stock_level, unit, brand, image_urls, is_active, is_featured) VALUES
    (cat_obst_gemuese, 'Bio Äpfel Elstar', 'bio-aepfel-elstar', 'Knackige Bio-Äpfel aus regionalem Anbau', 3.99, 150, 20, 'kg', 'BioLand', '["https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6"]', true, true),
    (cat_obst_gemuese, 'Bananen', 'bananen', 'Süße Bananen aus fairem Handel', 2.49, 200, 30, 'kg', 'Fairtrade', '["https://images.unsplash.com/photo-1603833665858-e61d17a86224"]', true, false),
    (cat_obst_gemuese, 'Tomaten Cherry', 'tomaten-cherry', 'Frische Cherry-Tomaten', 4.99, 80, 15, '500g', 'Demeter', '["https://images.unsplash.com/photo-1592841200221-a6898f307baa"]', true, false),
    (cat_obst_gemuese, 'Karotten', 'karotten', 'Knackige Karotten aus Deutschland', 1.99, 120, 25, 'kg', null, '["https://images.unsplash.com/photo-1598170845058-32b9d6a5da37"]', true, false),
    (cat_obst_gemuese, 'Gurken', 'gurken', 'Frische Salatgurken', 0.99, 90, 20, 'Stück', null, '["https://images.unsplash.com/photo-1604977042946-1eecc30f269e"]', true, false);

    -- ===================================
    -- PRODUCTS (Milchprodukte)
    -- ===================================
    INSERT INTO products (category_id, name, slug, description, price, stock, low_stock_level, unit, brand, barcode, image_urls, is_active, is_featured) VALUES
    (cat_milch, 'Frische Vollmilch 3,5%', 'vollmilch-35', 'Deutsche Frischmilch', 1.19, 180, 30, '1L', 'Weihenstephan', '4008452002017', '["https://images.unsplash.com/photo-1563636619-e9143da7973b"]', true, false),
    (cat_milch, 'Butter', 'butter', 'Deutsche Markenbutter', 2.49, 100, 20, '250g', 'Kerrygold', '5011061000052', '["https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d"]', true, true),
    (cat_milch, 'Naturjoghurt 3,8%', 'naturjoghurt-38', 'Cremiger Naturjoghurt', 0.89, 140, 25, '500g', 'Andechser Natur', '4104060006777', '["https://images.unsplash.com/photo-1488477181946-6428a0291777"]', true, false),
    (cat_milch, 'Gouda Jung', 'gouda-jung', 'Holländischer Schnittkäse', 5.99, 60, 10, '500g', 'Milram', '4000400001016', '["https://images.unsplash.com/photo-1452195100486-9cc805987862"]', true, false);

    -- ===================================
    -- PRODUCTS (Getränke)
    -- ===================================
    INSERT INTO products (category_id, name, slug, description, price, stock, low_stock_level, unit, brand, barcode, image_urls, is_active, is_featured) VALUES
    (cat_getraenke, 'Mineralwasser Classic', 'mineralwasser-classic', 'Natürliches Mineralwasser mit Kohlensäure', 0.79, 300, 50, '1,5L', 'Gerolsteiner', '4100590001501', '["https://images.unsplash.com/photo-1548839140-29a749e1cf4d"]', true, true),
    (cat_getraenke, 'Orangensaft 100%', 'orangensaft-100', 'Direktsaft aus sonnengereiften Orangen', 2.99, 90, 20, '1L', 'Granini', '4001679602003', '["https://images.unsplash.com/photo-1600271886742-f049cd451bba"]', true, false),
    (cat_getraenke, 'Apfelschorle', 'apfelschorle', 'Erfrischende Apfelschorle', 1.29, 150, 30, '1L', 'Lift', '5000112548741', '["https://images.unsplash.com/photo-1600880292203-757bb62b4baf"]', true, false),
    (cat_getraenke, 'Kaffee Gemahlen', 'kaffee-gemahlen', 'Arabica Kaffeebohnen gemahlen', 5.49, 70, 15, '500g', 'Dallmayr', '4008167103509', '["https://images.unsplash.com/photo-1447933601403-0c6688de566e"]', true, false);

    -- ===================================
    -- PRODUCTS (Brot & Backwaren)
    -- ===================================
    INSERT INTO products (category_id, name, slug, description, price, stock, low_stock_level, unit, brand, image_urls, is_active, is_featured) VALUES
    (cat_brot, 'Vollkornbrot', 'vollkornbrot', 'Frisches Vollkornbrot vom Bäcker', 2.89, 50, 10, '500g', 'Mestemacher', '["https://images.unsplash.com/photo-1509440159596-0249088772ff"]', true, false),
    (cat_brot, 'Brezel', 'brezel', 'Handgemachte Laugenbrezeln', 0.69, 80, 15, 'Stück', null, '["https://images.unsplash.com/photo-1555507036-ab1f4038808a"]', true, true),
    (cat_brot, 'Roggenmischbrot', 'roggenmischbrot', 'Herzhaftes Roggenmischbrot', 3.49, 40, 8, '750g', 'Harry Brot', '["https://images.unsplash.com/photo-1598373182133-52452f7691ef"]', true, false);

    -- ===================================
    -- PRODUCTS (Fleisch & Wurst)
    -- ===================================
    INSERT INTO products (category_id, name, slug, description, price, stock, low_stock_level, unit, brand, image_urls, is_active, is_featured) VALUES
    (cat_fleisch, 'Hähnchenbrust', 'haehnchenbrust', 'Frische Hähnchenbrust aus Deutschland', 9.99, 45, 10, 'kg', 'Wiesenhof', '["https://images.unsplash.com/photo-1604503468506-a8da13d82791"]', true, false),
    (cat_fleisch, 'Salami', 'salami', 'Herzhafter Salamiaufschnitt', 3.99, 60, 12, '200g', 'Rügenwalder Mühle', '["https://images.unsplash.com/photo-1599731625841-1e4ed62bd558"]', true, false);

    -- ===================================
    -- PRODUCTS (Snacks & Süßigkeiten)
    -- ===================================
    INSERT INTO products (category_id, name, slug, description, price, stock, low_stock_level, unit, brand, barcode, image_urls, is_active, is_featured) VALUES
    (cat_snacks, 'Chips Paprika', 'chips-paprika', 'Knusprige Kartoffelchips', 1.99, 110, 20, '175g', 'Funny Frisch', '4000522002408', '["https://images.unsplash.com/photo-1566478989037-eec170784d0b"]', true, false),
    (cat_snacks, 'Schokolade Vollmilch', 'schokolade-vollmilch', 'Zartschmelzende Vollmilchschokolade', 1.29, 150, 25, '100g', 'Milka', '7622201426804', '["https://images.unsplash.com/photo-1511381939415-e44015466834"]', true, true),
    (cat_snacks, 'Gummibärchen', 'gummibaerchen', 'Fruchtige Gummibärchen', 0.99, 200, 30, '200g', 'Haribo', '4001686346600', '["https://images.unsplash.com/photo-1582058091505-f87a2e55a40f"]', true, false);

END $$;

-- ===================================
-- 3) USERS
-- ===================================

-- Password for both users: "Test123!" (hashed with bcrypt)
-- Use bcryptjs in Node.js to generate: bcrypt.hashSync("Test123!", 10)
-- This is a sample hash - replace with actual hash in production

INSERT INTO users (id, first_name, last_name, email, password_hash, phone, is_active) VALUES
(gen_random_uuid(), 'Max', 'Müller', 'max.mueller@example.de', '$2a$10$5Zp0hN3jP1Y5xZ.LQ7Y8.eLH6vJMmD0q9w9wQ7Y8.eLH6vJMmD0q9', '+49 151 12345678', true),
(gen_random_uuid(), 'Anna', 'Schmidt', 'anna.schmidt@example.de', '$2a$10$5Zp0hN3jP1Y5xZ.LQ7Y8.eLH6vJMmD0q9w9wQ7Y8.eLH6vJMmD0q9', '+49 170 98765432', true);

-- ===================================
-- 4) ADDRESSES (German addresses)
-- ===================================

DO $$
DECLARE
    user_max_id UUID;
    user_anna_id UUID;
BEGIN
    SELECT id INTO user_max_id FROM users WHERE email = 'max.mueller@example.de';
    SELECT id INTO user_anna_id FROM users WHERE email = 'anna.schmidt@example.de';

    -- Max's addresses
    INSERT INTO addresses (user_id, title, street, house_number, address_line2, district, postal_code, city, state, description, is_default) VALUES
    (user_max_id, 'Zuhause', 'Hauptstraße', '42', null, 'Mitte', '10115', 'Berlin', 'Berlin', 'Bitte an der Haustür klingeln', true),
    (user_max_id, 'Arbeit', 'Friedrichstraße', '123', '4. Etage', 'Kreuzberg', '10117', 'Berlin', 'Berlin', 'Empfang im Erdgeschoss', false);

    -- Anna's address
    INSERT INTO addresses (user_id, title, street, house_number, address_line2, district, postal_code, city, state, description, is_default) VALUES
    (user_anna_id, 'Zuhause', 'Marienplatz', '8', 'Wohnung 12', 'Altstadt', '80331', 'München', 'Bayern', 'Code: 1234', true);

END $$;

-- ===================================
-- 5) DELIVERY ZONES
-- ===================================

INSERT INTO delivery_zones (name, minimum_amount, delivery_fee, estimated_time, max_distance_km, is_active) VALUES
('Zone A - Innenstadt', 25.00, 0.00, 30, 3.0, true),
('Zone B - Stadtgebiet', 30.00, 2.99, 45, 5.0, true),
('Zone C - Außenbezirke', 40.00, 4.99, 60, 10.0, true),
('Zone D - Umland', 50.00, 7.99, 90, 15.0, true);

-- ===================================
-- 6) ADMINS
-- ===================================

-- Password: "Admin123!" (hashed with bcrypt)
-- This is a sample hash - replace with actual hash in production

INSERT INTO admins (first_name, email, password_hash, role) VALUES
('Admin', 'admin@grunersuperstore.de', '$2a$10$5Zp0hN3jP1Y5xZ.LQ7Y8.eLH6vJMmD0q9w9wQ7Y8.eLH6vJMmD0q9', 'superadmin'),
('Mitarbeiter', 'mitarbeiter@grunersuperstore.de', '$2a$10$5Zp0hN3jP1Y5xZ.LQ7Y8.eLH6vJMmD0q9w9wQ7Y8.eLH6vJMmD0q9', 'admin');

-- ===================================
-- 7) SAMPLE FAVORITES
-- ===================================

DO $$
DECLARE
    user_max_id UUID;
    prod_aepfel UUID;
    prod_butter UUID;
    prod_wasser UUID;
    prod_schokolade UUID;
BEGIN
    SELECT id INTO user_max_id FROM users WHERE email = 'max.mueller@example.de';
    SELECT id INTO prod_aepfel FROM products WHERE slug = 'bio-aepfel-elstar';
    SELECT id INTO prod_butter FROM products WHERE slug = 'butter';
    SELECT id INTO prod_wasser FROM products WHERE slug = 'mineralwasser-classic';
    SELECT id INTO prod_schokolade FROM products WHERE slug = 'schokolade-vollmilch';

    INSERT INTO favorites (user_id, product_id) VALUES
    (user_max_id, prod_aepfel),
    (user_max_id, prod_butter),
    (user_max_id, prod_wasser),
    (user_max_id, prod_schokolade);

END $$;

-- ===================================
-- VERIFICATION QUERIES
-- ===================================

-- Uncomment to verify data:
-- SELECT COUNT(*) as category_count FROM categories;
-- SELECT COUNT(*) as product_count FROM products;
-- SELECT COUNT(*) as user_count FROM users;
-- SELECT COUNT(*) as address_count FROM addresses;
-- SELECT COUNT(*) as delivery_zone_count FROM delivery_zones;
-- SELECT COUNT(*) as admin_count FROM admins;
-- SELECT COUNT(*) as favorite_count FROM favorites;

-- Sample queries to test:
-- SELECT p.name, p.price, p.stock, c.name as category FROM products p JOIN categories c ON p.category_id = c.id WHERE p.is_active = true ORDER BY c.sort_order, p.name;
-- SELECT u.first_name, u.last_name, a.street, a.house_number, a.postal_code, a.city, a.state FROM users u JOIN addresses a ON u.id = a.user_id;
