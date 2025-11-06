# Gruner SuperStore - Datenbankstruktur

Vollständige PostgreSQL-Datenbankstruktur für das Gruner SuperStore Projekt.

## Übersicht

- **DBMS**: PostgreSQL 14+
- **Schema Version**: 1.0.0
- **Tabellen**: 10
- **Enums**: 3
- **Primary Keys**: UUID (gen_random_uuid())
- **Naming Convention**: snake_case
- **Timestamps**: created_at, updated_at (auto-update via trigger)

---

## 📋 Tabellen

### 1. users
**Zweck**: Registrierte Kunden

| Spalte        | Typ       | Beschreibung                    |
|---------------|-----------|--------------------------------|
| id            | UUID      | Primary Key                    |
| first_name    | TEXT      | Vorname                        |
| last_name     | TEXT      | Nachname                       |
| email         | TEXT      | E-Mail (unique)                |
| password_hash | TEXT      | Bcrypt-Hash des Passworts      |
| phone         | TEXT      | Telefonnummer                  |
| is_active     | BOOLEAN   | Aktiv-Status (default: true)   |
| created_at    | TIMESTAMP | Erstellungszeitpunkt           |
| updated_at    | TIMESTAMP | Aktualisierungszeitpunkt       |

**Constraints**:
- Email-Format-Validierung
- Unique email

**Indexes**:
- `idx_users_email` (email)
- `idx_users_is_active` (is_active)
- `idx_users_created_at` (created_at DESC)

---

### 2. addresses
**Zweck**: Deutsche Adressen für Lieferungen

| Spalte        | Typ       | Beschreibung                        |
|---------------|-----------|-------------------------------------|
| id            | UUID      | Primary Key                         |
| user_id       | UUID      | FK → users.id                       |
| title         | TEXT      | Titel (z.B. "Zuhause", "Arbeit")    |
| street        | TEXT      | Straßenname                         |
| house_number  | TEXT      | Hausnummer (z.B. "12A")             |
| address_line2 | TEXT      | Zusatz (Etage, Wohnung)             |
| district      | TEXT      | Stadtteil                           |
| postal_code   | TEXT      | PLZ (5 Ziffern)                     |
| city          | TEXT      | Stadt                               |
| state         | TEXT      | Bundesland                          |
| description   | TEXT      | Lieferhinweise                      |
| is_default    | BOOLEAN   | Standard-Adresse (default: false)   |
| created_at    | TIMESTAMP | Erstellungszeitpunkt                |
| updated_at    | TIMESTAMP | Aktualisierungszeitpunkt            |

**Constraints**:
- PLZ-Format: genau 5 Ziffern
- ON DELETE CASCADE (wenn User gelöscht wird)

**Indexes**:
- `idx_addresses_user_id` (user_id)
- `idx_addresses_postal_code` (postal_code)
- `idx_addresses_city` (city)
- `idx_addresses_state` (state)
- `idx_addresses_is_default` (user_id, is_default) WHERE is_default = true

---

### 3. categories
**Zweck**: Produktkategorien

| Spalte     | Typ       | Beschreibung                    |
|------------|-----------|--------------------------------|
| id         | UUID      | Primary Key                    |
| name       | TEXT      | Kategoriename                  |
| slug       | TEXT      | URL-freundlicher Slug (unique) |
| image_url  | TEXT      | Kategoriebild                  |
| sort_order | INTEGER   | Sortierreihenfolge             |
| is_active  | BOOLEAN   | Aktiv-Status (default: true)   |
| created_at | TIMESTAMP | Erstellungszeitpunkt           |
| updated_at | TIMESTAMP | Aktualisierungszeitpunkt       |

**Constraints**:
- Unique slug

**Indexes**:
- `idx_categories_slug` (slug)
- `idx_categories_is_active` (is_active)
- `idx_categories_sort_order` (sort_order)

---

### 4. products
**Zweck**: Produktkatalog mit Bestand

| Spalte         | Typ            | Beschreibung                            |
|----------------|----------------|-----------------------------------------|
| id             | UUID           | Primary Key                             |
| category_id    | UUID           | FK → categories.id                      |
| name           | TEXT           | Produktname                             |
| slug           | TEXT           | URL-freundlicher Slug (unique)          |
| description    | TEXT           | Produktbeschreibung                     |
| price          | NUMERIC(12,2)  | Preis (CHECK: >= 0)                     |
| stock          | INTEGER        | Lagerbestand (CHECK: >= 0)              |
| low_stock_level| INTEGER        | Schwellenwert für niedrigen Bestand     |
| unit           | TEXT           | Einheit (kg, Stück, Liter, etc.)        |
| barcode        | TEXT           | EAN/Barcode                             |
| brand          | TEXT           | Marke                                   |
| image_urls     | JSONB          | Array von Bild-URLs (JSON)              |
| is_active      | BOOLEAN        | Aktiv-Status (default: true)            |
| is_featured    | BOOLEAN        | Hervorgehoben (default: false)          |
| created_at     | TIMESTAMP      | Erstellungszeitpunkt                    |
| updated_at     | TIMESTAMP      | Aktualisierungszeitpunkt                |

**Constraints**:
- price >= 0
- stock >= 0
- low_stock_level >= 0 (if not null)
- ON DELETE RESTRICT für category_id

**Indexes**:
- `idx_products_slug` (slug)
- `idx_products_name` (name)
- `idx_products_brand` (brand)
- `idx_products_category_id` (category_id)
- `idx_products_is_active` (is_active)
- `idx_products_is_featured` (is_featured)
- `idx_products_price` (price)
- `idx_products_stock` (stock)
- `idx_products_barcode` (barcode)
- `idx_products_low_stock` (stock) WHERE stock <= low_stock_level
- `idx_products_featured_active` (is_featured, is_active, sort_order)

---

### 5. cart_items
**Zweck**: Warenkorb pro Benutzer

| Spalte     | Typ       | Beschreibung                    |
|------------|-----------|--------------------------------|
| id         | UUID      | Primary Key                    |
| user_id    | UUID      | FK → users.id                  |
| product_id | UUID      | FK → products.id               |
| quantity   | INTEGER   | Anzahl (CHECK: > 0)            |
| created_at | TIMESTAMP | Erstellungszeitpunkt           |
| updated_at | TIMESTAMP | Aktualisierungszeitpunkt       |

**Constraints**:
- quantity > 0
- UNIQUE (user_id, product_id) - verhindert Duplikate
- ON DELETE CASCADE für beide FKs

**Indexes**:
- `idx_cart_items_user_id` (user_id)
- `idx_cart_items_product_id` (product_id)

---

### 6. orders
**Zweck**: Kundenbestellungen (Abholung oder Lieferung)

| Spalte       | Typ            | Beschreibung                           |
|--------------|----------------|----------------------------------------|
| id           | UUID           | Primary Key                            |
| user_id      | UUID           | FK → users.id                          |
| order_no     | TEXT           | Menschenlesbare Bestellnummer (unique) |
| type         | order_type     | 'pickup' oder 'delivery'               |
| status       | order_status   | Bestellstatus                          |
| address_id   | UUID           | FK → addresses.id (null bei pickup)    |
| delivery_fee | NUMERIC(12,2)  | Liefergebühr (CHECK: >= 0)             |
| subtotal     | NUMERIC(12,2)  | Zwischensumme (CHECK: >= 0)            |
| total        | NUMERIC(12,2)  | Gesamtsumme (CHECK: >= 0)              |
| payment_type | payment_type   | Zahlungsart                            |
| note         | TEXT           | Kundennotiz                            |
| created_at   | TIMESTAMP      | Erstellungszeitpunkt                   |
| updated_at   | TIMESTAMP      | Aktualisierungszeitpunkt               |

**Enums**:
- `order_type`: pickup, delivery
- `order_status`: pending, accepted, preparing, shipped, delivered, cancelled
- `payment_type`: none, cash, card_on_delivery

**Constraints**:
- delivery_fee >= 0
- subtotal >= 0
- total >= 0
- Bei type='pickup' muss address_id NULL sein
- Bei type='delivery' muss address_id gesetzt sein
- ON DELETE RESTRICT für user_id und address_id

**Indexes**:
- `idx_orders_order_no` (order_no)
- `idx_orders_user_id_created_at` (user_id, created_at DESC)
- `idx_orders_status` (status)
- `idx_orders_type` (type)
- `idx_orders_created_at` (created_at DESC)
- `idx_orders_address_id` (address_id)
- `idx_orders_user_status_created` (user_id, status, created_at DESC)

---

### 7. order_items
**Zweck**: Bestellpositionen mit Snapshot-Daten

> **Wichtig**: Speichert Produktinformationen zum Zeitpunkt der Bestellung (Snapshot), um historische Daten zu bewahren.

| Spalte       | Typ            | Beschreibung                    |
|--------------|----------------|---------------------------------|
| id           | UUID           | Primary Key                     |
| order_id     | UUID           | FK → orders.id                  |
| product_id   | UUID           | FK → products.id (RESTRICT)     |
| product_name | TEXT           | Produktname (Snapshot)          |
| price        | NUMERIC(12,2)  | Einzelpreis (Snapshot)          |
| quantity     | INTEGER        | Anzahl (CHECK: > 0)             |
| unit         | TEXT           | Einheit (Snapshot)              |
| brand        | TEXT           | Marke (Snapshot)                |
| image_url    | TEXT           | Ein Bild (Snapshot)             |
| created_at   | TIMESTAMP      | Erstellungszeitpunkt            |
| updated_at   | TIMESTAMP      | Aktualisierungszeitpunkt        |

**Constraints**:
- quantity > 0
- price >= 0
- ON DELETE CASCADE für order_id
- ON DELETE RESTRICT für product_id

**Indexes**:
- `idx_order_items_order_id` (order_id)
- `idx_order_items_product_id` (product_id)

---

### 8. favorites
**Zweck**: Benutzer-Favoritenliste

| Spalte     | Typ       | Beschreibung                    |
|------------|-----------|--------------------------------|
| id         | UUID      | Primary Key                    |
| user_id    | UUID      | FK → users.id                  |
| product_id | UUID      | FK → products.id               |
| created_at | TIMESTAMP | Erstellungszeitpunkt           |
| updated_at | TIMESTAMP | Aktualisierungszeitpunkt       |

**Constraints**:
- UNIQUE (user_id, product_id)
- ON DELETE CASCADE für beide FKs

**Indexes**:
- `idx_favorites_user_id` (user_id)
- `idx_favorites_product_id` (product_id)
- `idx_favorites_created_at` (created_at DESC)

---

### 9. delivery_zones
**Zweck**: Lieferzonen mit Gebühren und Reichweite

| Spalte         | Typ            | Beschreibung                            |
|----------------|----------------|-----------------------------------------|
| id             | UUID           | Primary Key                             |
| name           | TEXT           | Zonenname                               |
| minimum_amount | NUMERIC(12,2)  | Mindestbestellwert (für kostenl. Lief.) |
| delivery_fee   | NUMERIC(12,2)  | Liefergebühr (CHECK: >= 0)              |
| estimated_time | INTEGER        | Geschätzte Lieferzeit (Minuten)         |
| max_distance_km| NUMERIC(6,2)   | Maximale Entfernung (km)                |
| is_active      | BOOLEAN        | Aktiv-Status (default: true)            |
| created_at     | TIMESTAMP      | Erstellungszeitpunkt                    |
| updated_at     | TIMESTAMP      | Aktualisierungszeitpunkt                |

**Constraints**:
- delivery_fee >= 0
- minimum_amount >= 0 (if not null)
- max_distance_km > 0 (if not null)
- estimated_time > 0

**Indexes**:
- `idx_delivery_zones_is_active` (is_active)
- `idx_delivery_zones_minimum_amount` (minimum_amount)
- `idx_delivery_zones_max_distance` (max_distance_km)

---

### 10. admins
**Zweck**: Admin-Benutzer für Verwaltungspanel

| Spalte        | Typ       | Beschreibung                    |
|---------------|-----------|--------------------------------|
| id            | UUID      | Primary Key                    |
| first_name    | TEXT      | Vorname                        |
| email         | TEXT      | E-Mail (unique)                |
| password_hash | TEXT      | Bcrypt-Hash des Passworts      |
| role          | TEXT      | 'admin' oder 'superadmin'      |
| created_at    | TIMESTAMP | Erstellungszeitpunkt           |
| updated_at    | TIMESTAMP | Aktualisierungszeitpunkt       |

**Constraints**:
- Email-Format-Validierung
- role IN ('admin', 'superadmin')
- Unique email

**Indexes**:
- `idx_admins_email` (email)
- `idx_admins_role` (role)

---

## 🔗 Beziehungen (Foreign Keys)

```
users (1) ──── (N) addresses
users (1) ──── (N) cart_items
users (1) ──── (N) orders
users (1) ──── (N) favorites

categories (1) ──── (N) products

products (1) ──── (N) cart_items
products (1) ──── (N) order_items
products (1) ──── (N) favorites

orders (1) ──── (N) order_items
orders (N) ──── (1) addresses (nullable für pickup)

addresses (N) ──── (1) users
```

**ON DELETE Strategien**:
- `CASCADE`: users → addresses, cart_items, favorites
- `CASCADE`: orders → order_items
- `CASCADE`: products → cart_items, favorites
- `RESTRICT`: orders → users, addresses
- `RESTRICT`: products → order_items (historische Daten bewahren)
- `RESTRICT`: categories → products

---

## 🚀 Migration ausführen

### 1. Datenbank erstellen

```bash
# PostgreSQL verbinden
psql -U postgres

# Datenbank erstellen
CREATE DATABASE gruner_superstore;

# Beenden
\q
```

### 2. Umgebungsvariablen setzen

```bash
# .env-Datei erstellen
cp .env.example .env

# Datenbank-Credentials anpassen
nano .env
```

### 3. Dependencies installieren

```bash
cd backend
npm install
```

### 4. Migration ausführen

```bash
# Alle Migrationen ausführen (Schema + Seed)
npm run migrate

# Oder spezifisch:
npm run migrate run
```

### 5. Datenbank zurücksetzen (VORSICHT!)

```bash
# Alle Tabellen löschen
npm run migrate:reset

# Dann neu migrieren
npm run migrate
```

---

## 📊 Seed-Daten

Die Seed-Daten enthalten:

### Kategorien (6)
- Obst & Gemüse
- Milchprodukte
- Getränke
- Brot & Backwaren
- Fleisch & Wurst
- Snacks & Süßigkeiten

### Produkte (~22)
Realistische deutsche Lebensmittel mit:
- Deutschen Markennamen (Weihenstephan, Kerrygold, Haribo, etc.)
- Realistischen Preisen
- EAN-Barcodes
- Lagerbestand
- Einheiten (kg, Liter, Stück, g)

### Benutzer (2)
- Max Müller (max.mueller@example.de)
- Anna Schmidt (anna.schmidt@example.de)
- Passwort für beide: `Test123!`

### Adressen (3)
Deutsche Adressen mit:
- Korrekter PLZ (5 Ziffern)
- Bundesland
- Stadt
- Straße + Hausnummer

### Delivery Zones (4)
- Zone A - Innenstadt (0-3 km, kostenlos ab 25€)
- Zone B - Stadtgebiet (3-5 km, 2.99€ ab 30€)
- Zone C - Außenbezirke (5-10 km, 4.99€ ab 40€)
- Zone D - Umland (10-15 km, 7.99€ ab 50€)

### Admins (2)
- admin@grunersuperstore.de (Superadmin)
- mitarbeiter@grunersuperstore.de (Admin)
- Passwort für beide: `Admin123!`

---

## 🔍 Nützliche Queries

### Produkte mit niedriger Lagermenge
```sql
SELECT p.name, p.stock, p.low_stock_level, c.name as category
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.stock <= p.low_stock_level
  AND p.is_active = true;
```

### Bestellungen eines Benutzers
```sql
SELECT o.order_no, o.type, o.status, o.total, o.created_at
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.email = 'max.mueller@example.de'
ORDER BY o.created_at DESC;
```

### Bestelldetails
```sql
SELECT
  o.order_no,
  oi.product_name,
  oi.quantity,
  oi.unit,
  oi.price,
  (oi.quantity * oi.price) as line_total
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.order_no = 'ORD-001'
ORDER BY oi.created_at;
```

### Bestseller-Produkte
```sql
SELECT
  p.name,
  COUNT(oi.id) as order_count,
  SUM(oi.quantity) as total_sold
FROM products p
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name
ORDER BY total_sold DESC
LIMIT 10;
```

### Benutzer mit Standardadresse
```sql
SELECT
  u.first_name,
  u.last_name,
  a.street,
  a.house_number,
  a.postal_code,
  a.city,
  a.state
FROM users u
JOIN addresses a ON u.id = a.user_id
WHERE a.is_default = true;
```

---

## 🛠️ Prisma Client verwenden

```bash
# Prisma Client generieren
npx prisma generate

# Prisma Studio starten (GUI)
npx prisma studio
```

### Beispiel-Code mit Prisma

```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Alle aktiven Produkte abrufen
const products = await prisma.product.findMany({
  where: { isActive: true },
  include: { category: true },
  orderBy: { name: 'asc' }
});

// Neue Bestellung erstellen
const order = await prisma.order.create({
  data: {
    userId: userId,
    orderNo: 'ORD-123',
    type: 'delivery',
    status: 'pending',
    addressId: addressId,
    subtotal: 50.00,
    deliveryFee: 2.99,
    total: 52.99,
    orderItems: {
      create: [
        {
          productId: productId,
          productName: 'Bio Äpfel',
          price: 3.99,
          quantity: 2,
          unit: 'kg'
        }
      ]
    }
  }
});
```

---

## 📝 Wartung

### Backup erstellen
```bash
pg_dump -U postgres gruner_superstore > backup.sql
```

### Backup wiederherstellen
```bash
psql -U postgres gruner_superstore < backup.sql
```

### Datenbankgröße prüfen
```sql
SELECT pg_size_pretty(pg_database_size('gruner_superstore'));
```

### Tabellengrößen
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## ✅ Best Practices

1. **Immer Transaktionen verwenden** bei mehreren zusammenhängenden Updates
2. **Snapshots** in order_items bewahren historische Daten
3. **Soft Deletes** via `is_active` für wichtige Daten
4. **Indexes** regelmäßig überprüfen und optimieren
5. **Foreign Key Constraints** schützen Datenintegrität
6. **CHECK Constraints** validieren Geschäftsregeln
7. **updated_at** wird automatisch via Trigger aktualisiert

---

## 📚 Weiterführende Dokumentation

- [PostgreSQL Dokumentation](https://www.postgresql.org/docs/)
- [Prisma Dokumentation](https://www.prisma.io/docs)
- [Node.js pg Modul](https://node-postgres.com/)
