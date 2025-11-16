# Production Deployment Guide - Gruner SuperStore

Bu dokümantasyon, Gruner SuperStore projesini Ubuntu sunucuya production ortamında kurmak için gereken tüm adımları içerir.

## Sunucu Bilgileri

- **Domain**: gruner-super.store
- **IP Adresi**: 87.106.47.222
- **İşletim Sistemi**: Ubuntu (sıfırdan kurulum)

## Ön Gereksinimler

- Root erişimi olan Ubuntu sunucu
- Domain DNS kayıtları yapılmış olmalı (A record: 87.106.47.222)
- SSH erişimi

---

## 1. Sunucu Hazırlığı

### 1.1. Sunucuya Bağlanma

```bash
ssh root@87.106.47.222
# Şifre: vPr2TD0r
```

### 1.2. Sistem Güncellemesi

```bash
# Sistem paketlerini güncelle
apt update && apt upgrade -y

# Gerekli temel paketleri yükle
apt install -y curl wget git build-essential software-properties-common
```

### 1.3. Firewall Yapılandırması

```bash
# UFW firewall'u yükle ve aktif et
apt install -y ufw

# SSH portunu aç (önemli: kendini kilitleme!)
ufw allow 22/tcp

# HTTP ve HTTPS portlarını aç
ufw allow 80/tcp
ufw allow 443/tcp

# Firewall'u aktif et
ufw --force enable

# Durumu kontrol et
ufw status
```

---

## 2. Node.js Kurulumu

### 2.1. Node.js 20.x Kurulumu

```bash
# NodeSource repository ekle (Node.js 20 için)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Node.js yükle
apt install -y nodejs

# Versiyon kontrolü
node --version  # v20.x.x olmalı
npm --version
```

**Not:** Eğer daha önce Node.js 18 kurduysanız ve Node.js 20'ye geçmek istiyorsanız, aşağıdaki adımları izleyin.

### 2.2. PM2 Kurulumu

```bash
# PM2'yi global olarak yükle
npm install -g pm2

# PM2'yi sistem başlangıcında otomatik başlat
pm2 startup systemd
# Çıkan komutu çalıştır (sudo ile başlayan komut)

# PM2 versiyon kontrolü
pm2 --version
```

---

## 3. PostgreSQL Kurulumu

### 3.1. PostgreSQL 14+ Kurulumu

```bash
# PostgreSQL repository ekle
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update

# PostgreSQL yükle
apt install -y postgresql postgresql-contrib

# PostgreSQL versiyon kontrolü
psql --version
```

### 3.2. PostgreSQL Yapılandırması

```bash
# PostgreSQL servisini başlat
systemctl start postgresql
systemctl enable postgresql

# PostgreSQL'e bağlan
sudo -u postgres psql

# PostgreSQL içinde:
# Şifre oluştur
ALTER USER postgres WITH PASSWORD 'admin999';

# Veritabanı oluştur (master database - tenant yönetimi için)
CREATE DATABASE gruner_master;

# Çıkış
\q
```

### 3.3. PostgreSQL Uzaktan Erişim (Opsiyonel)

Eğer uzaktan erişim gerekiyorsa:

```bash
# postgresql.conf dosyasını düzenle
nano /etc/postgresql/*/main/postgresql.conf

# Şu satırı bul ve değiştir:
# listen_addresses = 'localhost'
# Şuna çevir:
listen_addresses = '*'

# pg_hba.conf dosyasını düzenle
nano /etc/postgresql/*/main/pg_hba.conf

# Dosyanın sonuna ekle:
host    all             all             0.0.0.0/0               md5

# PostgreSQL'i yeniden başlat
systemctl restart postgresql
```

---

## 4. Nginx Kurulumu

### 4.1. Nginx Yükleme

```bash
# Nginx yükle
apt install -y nginx

# Nginx'i başlat ve otomatik başlatmayı etkinleştir
systemctl start nginx
systemctl enable nginx

# Durum kontrolü
systemctl status nginx
```

### 4.2. Nginx Temel Yapılandırma

```bash
# Varsayılan site'ı devre dışı bırak
rm /etc/nginx/sites-enabled/default

# Nginx config dosyası oluştur (sonra düzenleyeceğiz)
touch /etc/nginx/sites-available/gruner-super.store
```

---

## 5. Proje Kurulumu

### 5.1. Proje Klasörü Oluşturma

```bash
# Proje için klasör oluştur
mkdir -p /var/www
cd /var/www

# Projeyi klonla
git clone https://github.com/yusuffkarac/GrunerSuperStore.git
cd GrunerSuperStore

# Proje sahibini ayarla
chown -R $USER:$USER /var/www/GrunerSuperStore
```

### 5.2. Backend Kurulumu

```bash
cd /var/www/GrunerSuperStore/backend

# Bağımlılıkları yükle
npm install

# Prisma client oluştur
npx prisma generate
```

### 5.3. Backend Environment Variables

```bash
# .env dosyası oluştur
nano .env
```

Aşağıdaki içeriği ekleyin (değerleri kendi bilgilerinizle değiştirin):

```env
# Production Environment
NODE_ENV=production
PORT=5001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gruner_superstore
DB_USER=postgres
DB_PASSWORD=admin999
# Prisma CLI için DATABASE_URL (DB bilgilerinden otomatik oluşturulur, ama Prisma CLI için gerekli)
DATABASE_URL=postgresql://postgres:admin999@localhost:5432/gruner_superstore?connection_limit=20&pool_timeout=10

# JWT
JWT_SECRET=BurayaÇokGüçlüBirJWTSecretYazınEnAz64Karakter

# CORS
CORS_ORIGIN=https://gruner-super.store,http://gruner-super.store

# Upload Path
UPLOAD_PATH=uploads

# Email (SMTP) - Kendi SMTP bilgilerinizi girin
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@gruner-super.store

# Cloudinary (Görsel depolama) - Kendi Cloudinary bilgilerinizi girin
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# OpenRouteService (Opsiyonel - Teslimat mesafe hesaplama)
OPENROUTESERVICE_API_KEY=your-api-key

# Redis (Opsiyonel - Rate limiting için)
REDIS_HOST=localhost
REDIS_PORT=6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 5.4. Veritabanı Oluşturma ve Migration

```bash
cd /var/www/GrunerSuperStore/backend

# Veritabanını oluştur
sudo -u postgres psql -c "CREATE DATABASE gruner_superstore;"

# Migration'ları çalıştır
# Önce .env dosyasını yükle
export $(cat .env | grep -v '^#' | xargs)

# Custom migration script kullan (Prisma migrate yerine)
npm run migrate
```

**Not:** Eğer migration sırasında hata alırsanız (örneğin `coupon_id` hatası), şu adımları izleyin:

```bash
# 1. Mevcut coupons tablosunu kontrol et
sudo -u postgres psql -d gruner_superstore -c "\d coupons"

# 2. Eğer coupons tablosu id kolonu olmadan varsa, düzelt
sudo -u postgres psql -d gruner_superstore << EOF
-- Eğer coupons tablosu varsa ama id kolonu yoksa
DO \$\$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupons') THEN
        -- Eğer id kolonu yoksa ekle
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'id') THEN
            ALTER TABLE coupons ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
        END IF;
    END IF;
END \$\$;
EOF

# 3. Migration'ı tekrar çalıştır
npm run migrate
```

**Alternatif:** Eğer migration 025'te hata alırsanız ve coupons tablosu sorunluysa:

```bash
# Coupons tablosunu ve bağlı tabloları sil
sudo -u postgres psql -d gruner_superstore -c "DROP TABLE IF EXISTS coupon_usages CASCADE;"
sudo -u postgres psql -d gruner_superstore -c "DROP TABLE IF EXISTS coupons CASCADE;"

# Orders tablosundaki coupon_id foreign key'ini kaldır (eğer varsa)
sudo -u postgres psql -d gruner_superstore -c "ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_coupon_id_fkey;"

# Migration'ı tekrar çalıştır
npm run migrate
```

**Önemli:** Eğer `stock_orders` veya `admins.role_id` gibi eksik tablo/kolon hataları alırsanız:

```bash
# 1. Migration 025'i tracking'den sil (eğer kayıtlıysa)
sudo -u postgres psql -d gruner_superstore -c "DELETE FROM schema_migrations WHERE filename = '025_create_full_schema_from_prisma.sql';"

# 2. Eksik tabloları ve kolonları manuel oluştur
sudo -u postgres psql -d gruner_superstore << 'EOF'
-- Admin Roles tablosu (eğer yoksa)
CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Permissions tablosu (eğer yoksa)
CREATE TABLE IF NOT EXISTS admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admins tablosuna role_id kolonu ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admins' AND column_name = 'role_id'
    ) THEN
        ALTER TABLE admins ADD COLUMN role_id UUID;
        ALTER TABLE admins ADD CONSTRAINT admins_role_id_fkey 
            FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Stock Orders tablosu (eğer yoksa)
CREATE TABLE IF NOT EXISTS stock_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending',
    order_quantity INTEGER NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    note TEXT,
    previous_order_id UUID REFERENCES stock_orders(id) ON DELETE SET NULL,
    is_undone BOOLEAN DEFAULT false,
    undone_at TIMESTAMP,
    undone_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Order Status enum'u oluştur (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_order_status') THEN
        CREATE TYPE stock_order_status AS ENUM ('pending', 'ordered', 'delivered', 'cancelled');
    END IF;
END $$;

-- Stock Orders tablosundaki status kolonunu enum'a çevir
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'stock_orders' AND column_name = 'status' 
               AND data_type = 'text') THEN
        ALTER TABLE stock_orders 
        ALTER COLUMN status TYPE stock_order_status 
        USING status::stock_order_status;
    END IF;
END $$;

-- Coupons tablosu (eğer yoksa)
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT,
    type TEXT NOT NULL,
    discount_percent DECIMAL(5,2),
    discount_amount DECIMAL(12,2),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    min_purchase DECIMAL(12,2),
    max_discount DECIMAL(12,2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    user_usage_limit INTEGER DEFAULT 1,
    apply_to_all BOOLEAN DEFAULT true,
    user_ids JSONB,
    category_ids JSONB,
    product_ids JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coupon Type enum'u oluştur (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coupon_type') THEN
        CREATE TYPE coupon_type AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
    END IF;
END $$;

-- Coupons tablosundaki type kolonunu enum'a çevir
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'coupons' AND column_name = 'type' 
               AND data_type = 'text') THEN
        ALTER TABLE coupons 
        ALTER COLUMN type TYPE coupon_type 
        USING type::coupon_type;
    END IF;
END $$;

-- Orders tablosuna coupon_id ve diğer eksik kolonları ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'coupon_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN coupon_id UUID;
        ALTER TABLE orders ADD COLUMN coupon_code TEXT;
        -- discount kolonu zaten varsa kontrol et
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'orders' AND column_name = 'discount'
        ) THEN
            ALTER TABLE orders ADD COLUMN discount DECIMAL(12,2) DEFAULT 0;
        END IF;
        -- billing_address_id kolonu
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'orders' AND column_name = 'billing_address_id'
        ) THEN
            ALTER TABLE orders ADD COLUMN billing_address_id UUID REFERENCES addresses(id) ON DELETE RESTRICT;
        END IF;
        -- cancellation kolonları
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'orders' AND column_name = 'cancellation_reason'
        ) THEN
            ALTER TABLE orders ADD COLUMN cancellation_reason TEXT;
            ALTER TABLE orders ADD COLUMN cancellation_internal_note TEXT;
            ALTER TABLE orders ADD COLUMN cancellation_customer_message TEXT;
            ALTER TABLE orders ADD COLUMN show_cancellation_reason_to_customer BOOLEAN DEFAULT false;
        END IF;
    END IF;
END $$;
EOF

# 3. Migration'ı tekrar çalıştır
export $(cat .env | grep -v '^#' | xargs)
npm run migrate
```

### 5.5. İlk Admin Kullanıcı Oluşturma

```bash
cd /var/www/GrunerSuperStore/backend

# Environment variable'ları yükle
export $(cat .env | grep -v '^#' | xargs)

# Admin kullanıcı oluştur
npm run create-admin
# Email ve şifre soracak, girin
# Örnek:
# Email: admin@gruner-super.store
# Password: GüçlüBirŞifre123!
```

**Önemli:** Admin kullanıcısı oluşturduktan sonra bu email ve şifre ile admin paneline giriş yapabilirsiniz.

### 5.5.1. Admin Paneline Giriş

Admin paneline giriş yapmak için:

1. **Tarayıcıda şu adresi açın:**
   ```
   https://gruner-super.store/admin/login
   ```

2. **Oluşturduğunuz admin email ve şifresini girin:**
   - Email: (create-admin komutunda girdiğiniz email)
   - Password: (create-admin komutunda girdiğiniz şifre)

3. **Giriş yaptıktan sonra admin dashboard'a yönlendirileceksiniz:**
   ```
   https://gruner-super.store/admin/dashboard
   ```

**Not:** Eğer admin kullanıcısı oluşturmadıysanız veya şifresini unuttuysanız, yeni bir admin kullanıcısı oluşturabilir veya mevcut admin şifresini sıfırlayabilirsiniz (veritabanından manuel olarak).

**Önemli:** Eğer admin paneline giriş yaptıktan sonra "notifications table does not exist" veya "admin_roles.is_active column does not exist" gibi hatalar alırsanız, eksik tabloları ve kolonları oluşturun:

```bash
sudo -u postgres psql -d gruner_superstore << 'EOF'
-- Notification Type enum'u (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');
    END IF;
END $$;

-- Notifications tablosu (eğer yoksa)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'info',
    action_url TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Roles tablosuna is_active kolonu ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_roles' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE admin_roles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_admin_id ON notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
EOF

# Tablonun oluşturulduğunu kontrol et
sudo -u postgres psql -d gruner_superstore -c "\d notifications"

# Prisma Client'ı yeniden generate et (önemli!)
cd /var/www/GrunerSuperStore/backend
npx prisma generate

# PM2'yi yeniden başlat
pm2 restart ecosystem.config.cjs
```

### 5.6. Upload Klasörlerini Oluşturma

```bash
cd /var/www/GrunerSuperStore/backend

# Upload klasörlerini oluştur
mkdir -p uploads/products
mkdir -p uploads/categories
mkdir -p uploads/campaigns
mkdir -p uploads/general

# İzinleri ayarla
chmod -R 755 uploads
chown -R $USER:$USER uploads
```

### 5.7. Frontend Kurulumu

```bash
cd /var/www/GrunerSuperStore/frontend

# Bağımlılıkları yükle
npm install

# .env dosyası oluştur (frontend için)
nano .env.production
```

İçeriği:
```env
VITE_API_URL=https://gruner-super.store/api
```

```bash
# Production build yap
npm run build

# Build çıktısı dist/ klasörüne yazılacak
```

---

## 5.8. Node.js 20'ye Geçiş (Opsiyonel - Eğer Node.js 18 Kuruluysa)

Eğer daha önce Node.js 18 kurduysanız ve Node.js 20.19.5'e geçmek istiyorsanız:

```bash
# 1. PM2'deki tüm process'leri durdur
pm2 stop all
pm2 delete all

# 2. Eski Node.js'i kaldır
apt remove -y nodejs
apt purge -y nodejs
apt autoremove -y

# 3. NodeSource repository'yi temizle (eğer varsa)
rm -f /etc/apt/sources.list.d/nodesource.list

# 4. Node.js 20.x repository ekle
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# 5. Node.js 20'yi yükle
apt install -y nodejs

# 6. Versiyon kontrolü
node --version  # v20.19.5 veya üzeri olmalı
npm --version

# 7. PM2'yi yeniden yükle (Node.js 20 ile uyumlu olması için)
npm install -g pm2

# 8. PM2 startup'ı yeniden yapılandır
pm2 unstartup systemd
pm2 startup systemd
# Çıkan komutu çalıştır (sudo ile başlayan komut)

# 9. Backend node_modules'ları yeniden yükle (Node.js 20 ile uyumluluk için)
cd /var/www/GrunerSuperStore/backend
rm -rf node_modules package-lock.json
npm install

# 10. Prisma client'ı yeniden oluştur
npx prisma generate

# 11. Frontend node_modules'ları yeniden yükle
cd /var/www/GrunerSuperStore/frontend
rm -rf node_modules package-lock.json

# Eğer vite-plugin-pwa dependency conflict hatası alırsanız:
# Seçenek 1: --legacy-peer-deps ile yükle (önerilen)
npm install --legacy-peer-deps

# Eğer "Cannot find package 'vite'" hatası alırsanız:
# 1. node_modules içinde vite'ın olup olmadığını kontrol et
ls node_modules | grep vite

# 2. npx cache'i temizle
rm -rf ~/.npm/_npx

# 3. Vite'ı manuel olarak yükle
npm install vite@^5.1.0 --legacy-peer-deps --save-dev

# 4. Tüm bağımlılıkları tekrar yükle
npm install --legacy-peer-deps

# 5. Vite'ın yüklendiğini doğrula
ls node_modules/vite

# 6. Vite'ın node_modules/.bin'de olup olmadığını kontrol et
ls -la node_modules/.bin/vite

# Eğer vite yoksa, tüm bağımlılıkları yeniden yükle
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# 7. Vite'ın yüklendiğini doğrula
which vite
ls node_modules/.bin/vite

# 8. package.json'daki build script'ini kontrol et
# "build": "vite build" olmalı (npx olmadan)

# 9. Frontend'i yeniden build et
npm run build

# Eğer hala "vite: not found" hatası alırsanız:
# 1. node_modules/vite klasörünün var olup olmadığını kontrol et
ls node_modules/vite

# 2. Eğer vite klasörü yoksa, vite'ı manuel olarak yükle
npm install vite@5.1.11 --legacy-peer-deps --save-dev

# 3. Vite'ın yüklendiğini kontrol et
ls node_modules/vite
ls node_modules/.bin/vite

# 4. Eğer hala yoksa, package.json'ı kontrol et ve vite'ı direkt yükle
npm install vite --legacy-peer-deps --save-dev

# 5. Tüm bağımlılıkları yeniden yükle
npm install --legacy-peer-deps

# 6. Vite'ı direkt path ile çalıştır
./node_modules/.bin/vite build

# VEYA package.json'daki build script'ini şu şekilde değiştir:
# "build": "node_modules/.bin/vite build"

# 13. PM2 config'i kontrol et ve uygulamayı başlat
cd /var/www/GrunerSuperStore/backend
pm2 start ecosystem.config.cjs
pm2 save

# 14. PM2 durumunu kontrol et
pm2 status
pm2 logs
```

**Önemli Notlar:**
- Node.js versiyonu değiştiğinde `node_modules` klasörlerini yeniden yüklemeniz önerilir
- PM2 process'lerini durdurup yeniden başlatmanız gerekir
- Prisma client'ı yeniden generate etmeniz gerekebilir

---

## 6. PM2 Yapılandırması

### 6.1. PM2 Ecosystem Config Oluşturma

Tek tenant kullanımı için basit bir PM2 config oluşturun:

```bash
cd /var/www/GrunerSuperStore/backend
nano ecosystem.config.cjs
```

İçeriği:
```javascript
const dotenv = require('dotenv');
const path = require('path');

// .env dosyasını yükle
dotenv.config({ path: path.join(__dirname, '.env') });

module.exports = {
  apps: [{
    name: 'gruner-backend',
    script: 'src/server.js',
    instances: 1,
    exec_mode: 'fork',
    // Environment variables'ı .env dosyasından yükle
    env: {
      NODE_ENV: 'production',
      ...process.env, // .env dosyasından yüklenen tüm değişkenler
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    merge_logs: true,
    kill_timeout: 5000,
  }],
};
```

**Not:** Bu config `.env` dosyasını otomatik olarak yükler ve PM2'ye environment variable'ları aktarır.

### 6.2. PM2 Log Klasörü Oluşturma

```bash
cd /var/www/GrunerSuperStore/backend
mkdir -p logs
chmod 755 logs
```

### 6.3. PM2 ile Uygulamayı Başlatma

```bash
cd /var/www/GrunerSuperStore/backend

# PM2 ile başlat
pm2 start ecosystem.config.cjs

# PM2 durumunu kontrol et
pm2 status

# PM2 loglarını görüntüle
pm2 logs

# PM2'yi kaydet (sistem yeniden başladığında otomatik başlasın)
pm2 save
```

---

## 7. Nginx Yapılandırması

### 7.1. Nginx Config Dosyası Oluşturma

```bash
nano /etc/nginx/sites-available/gruner-super.store
```

Aşağıdaki içeriği ekleyin:

```nginx
# HTTP -> HTTPS yönlendirme
server {
    listen 80;
    listen [::]:80;
    server_name gruner-super.store www.gruner-super.store;

    # Let's Encrypt için
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # HTTPS'e yönlendir
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name gruner-super.store www.gruner-super.store;

    # SSL sertifikaları (Let's Encrypt sonrası eklenecek)
    # ssl_certificate /etc/letsencrypt/live/gruner-super.store/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/gruner-super.store/privkey.pem;

    # SSL yapılandırması
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Client max body size (dosya yükleme için)
    client_max_body_size 50M;

    # Frontend (Static files)
    location / {
        root /var/www/GrunerSuperStore/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
        
        # Cache control
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout ayarları
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Upload klasörü (opsiyonel - direkt erişim için)
    location /uploads {
        alias /var/www/GrunerSuperStore/backend/uploads;
        expires 1y;
        add_header Cache-Control "public";
    }
}
```

### 7.2. Nginx Config'i Aktif Etme

```bash
# Symbolic link oluştur (eğer zaten varsa hata vermez)
ln -sf /etc/nginx/sites-available/gruner-super.store /etc/nginx/sites-enabled/

# Nginx config'i test et
nginx -t

# Eğer "ssl_certificate" hatası alırsanız:
# SSL sertifikası alınmadan önce HTTPS server bloğunu geçici olarak yorum satırı yapın
# veya sadece HTTP server bloğunu aktif bırakın
# Certbot SSL sertifikasını aldıktan sonra otomatik olarak HTTPS bloğunu ekleyecek

# Hata yoksa Nginx'i reload et
systemctl reload nginx
```

**Önemli:** Eğer `ssl_certificate` hatası alırsanız, SSL sertifikası alınmadan önce Nginx config dosyasında HTTPS server bloğunu geçici olarak yorum satırı yapın veya silin:

```bash
nano /etc/nginx/sites-available/gruner-super.store
```

HTTPS server bloğunu (443 portu) tamamen yorum satırı yapın veya silin. Sadece HTTP server bloğu (80 portu) aktif olmalı. Ayrıca HTTP bloğundaki HTTPS yönlendirmesini de geçici olarak kaldırın. Certbot SSL sertifikasını aldıktan sonra otomatik olarak HTTPS bloğunu ekleyecek.

**Örnek config (Certbot öncesi):**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name gruner-super.store www.gruner-super.store;

    # Let's Encrypt için
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Frontend (Static files) - HTTPS yönlendirmesi kaldırıldı
    location / {
        root /var/www/GrunerSuperStore/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTPS server bloğu geçici olarak yorum satırı - Certbot sonrası aktif edilecek
# server {
#     listen 443 ssl http2;
#     ...
# }
```

---

## 8. SSL Sertifikası (Let's Encrypt)

### 8.1. Certbot Kurulumu

**ÖNEMLİ:** Certbot çalıştırmadan önce Nginx config dosyasında HTTPS server bloğunu (443 portu) geçici olarak yorum satırı yapın veya kaldırın. Sadece HTTP server bloğu (80 portu) aktif olmalı.

```bash
# Nginx config dosyasını düzenle
nano /etc/nginx/sites-available/gruner-super.store
```

HTTPS server bloğunu (443 portu) yorum satırı yapın veya silin. Örnek:

```nginx
# Geçici olarak yorum satırı - Certbot sonrası aktif edilecek
# server {
#     listen 443 ssl http2;
#     ...
# }
```

Sadece HTTP server bloğu aktif olmalı:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name gruner-super.store www.gruner-super.store;
    ...
}
```

```bash
# Nginx config'i test et
nginx -t

# Hata yoksa Nginx'i reload et
systemctl reload nginx

# Certbot yükle
apt install -y certbot python3-certbot-nginx

# SSL sertifikası al
# Eğer www subdomain'i için DNS kaydı yoksa, sadece ana domain için alın:
certbot --nginx -d gruner-super.store

# VEYA eğer www DNS kaydı varsa:
# certbot --nginx -d gruner-super.store -d www.gruner-super.store

# Email adresi ve şartları kabul et
# Certbot otomatik olarak HTTPS server bloğunu ekleyecek ve SSL satırlarını yapılandıracak
```

**Not:** Eğer `www.gruner-super.store` için DNS hatası alırsanız:
1. Sadece ana domain için sertifika alın: `certbot --nginx -d gruner-super.store`
2. Veya DNS'te www kaydı ekleyin ve sonra tekrar deneyin
3. Veya www olmadan devam edin (ana domain yeterli olabilir)

### 8.2. SSL Otomatik Yenileme

```bash
# Certbot otomatik yenileme test et
certbot renew --dry-run

# Cron job zaten otomatik kurulmuş olmalı, kontrol et
systemctl status certbot.timer
```

### 8.3. Nginx Config'i Güncelleme

Certbot SSL sertifikasını aldıktan sonra otomatik olarak Nginx config dosyasını günceller. Final config dosyası şu şekilde olmalı:

```nginx
# HTTPS server (Certbot tarafından otomatik oluşturuldu)
server {
    server_name gruner-super.store www.gruner-super.store;

    # Let's Encrypt için
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Frontend (Static files)
    location / {
        root /var/www/GrunerSuperStore/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;

        # Cache control
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout ayarları
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Upload klasörü (opsiyonel - direkt erişim için)
    location /uploads {
        alias /var/www/GrunerSuperStore/backend/uploads;
        expires 1y;
        add_header Cache-Control "public";
    }

    # SSL yapılandırması (Certbot tarafından otomatik eklenir)
    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/gruner-super.store/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/gruner-super.store/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

# HTTP -> HTTPS yönlendirme (Certbot tarafından otomatik oluşturuldu)
server {
    if ($host = gruner-super.store) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    listen [::]:80;
    server_name gruner-super.store www.gruner-super.store;
    return 404; # managed by Certbot
}
```

Certbot config dosyasını otomatik olarak güncelledi. Nginx'i test edin ve reload edin:

```bash
# Nginx config'i test et
nginx -t

# Hata yoksa Nginx'i reload et
systemctl reload nginx
```

**Not:** Certbot tarafından yönetilen satırları (`# managed by Certbot`) manuel olarak değiştirmeyin. Certbot yenileme işlemlerinde bu satırları otomatik günceller.

---

## 9. Domain DNS Yapılandırması

Domain sağlayıcınızın DNS panelinde şu kayıtları oluşturun:

```
A Record:
  Name: @
  Value: 87.106.47.222
  TTL: 3600

A Record:
  Name: www
  Value: 87.106.47.222
  TTL: 3600
```

DNS değişikliklerinin yayılması 24-48 saat sürebilir. Kontrol etmek için:

```bash
# DNS kontrolü
nslookup gruner-super.store
dig gruner-super.store
```

---

## 10. Güvenlik Ayarları

### 10.1. Fail2Ban Kurulumu (Brute Force Koruması)

```bash
# Fail2Ban yükle
apt install -y fail2ban

# Fail2Ban'ı başlat
systemctl start fail2ban
systemctl enable fail2ban

# Durum kontrolü
fail2ban-client status
```

### 10.2. SSH Güvenliği

**Amaç:** SSH bağlantılarını güvenli hale getirmek ve brute force saldırılarına karşı korumak.

**ÖNEMLİ UYARI:** Bu ayarları yapmadan önce yeni bir kullanıcı oluşturun ve SSH key'inizi ekleyin. Aksi halde sunucuya erişemezsiniz!

```bash
# 1. ÖNCE: Yeni bir kullanıcı oluştur (root yerine)
adduser yusuf
usermod -aG sudo yusuf

# 2. SSH key'inizi yeni kullanıcıya ekle
mkdir -p /home/yusuf/.ssh
nano /home/yusuf/.ssh/authorized_keys
# SSH public key'inizi buraya yapıştırın
chmod 700 /home/yusuf/.ssh
chmod 600 /home/yusuf/.ssh/authorized_keys
chown -R yusuf:yusuf /home/yusuf/.ssh

# 3. Yeni kullanıcı ile bağlantıyı test et
# Başka bir terminalden: ssh yusuf@87.106.47.222

# 4. SSH config dosyasını düzenle
nano /etc/ssh/sshd_config

# Şu ayarları yapın:
# PermitRootLogin no          # Root login'i kapat (güvenlik için)
# PasswordAuthentication no   # Şifre ile girişi kapat, sadece SSH key kullan
# Port 2222                   # Varsayılan 22 portunu değiştir (opsiyonel)
# PubkeyAuthentication yes    # SSH key ile girişi aktif et

# 5. SSH config'i test et
sshd -t

# 6. SSH'ı yeniden başlat
systemctl restart sshd

# 7. Yeni port ile bağlantıyı test et (eğer port değiştirdiyseniz)
# ssh -p 2222 yusuf@87.106.47.222
```

**Güvenlik Ayarlarının Açıklamaları:**

1. **PermitRootLogin no**: Root kullanıcısı ile direkt SSH bağlantısını engeller. Saldırganlar genellikle root kullanıcısını hedefler.

2. **PasswordAuthentication no**: Şifre ile girişi kapatır, sadece SSH key ile girişe izin verir. Brute force saldırılarını önler.

3. **Port 2222**: Varsayılan SSH portunu (22) değiştirir. Otomatik taramaları azaltır (opsiyonel, ama önerilir).

**Not:** Bu ayarları yapmadan önce mutlaka yeni bir kullanıcı oluşturun ve SSH key'inizi ekleyin. Aksi halde sunucuya erişemezsiniz!

### 10.3. Otomatik Güvenlik Güncellemeleri

```bash
# Unattended-upgrades yükle
apt install -y unattended-upgrades

# Yapılandır
dpkg-reconfigure -plow unattended-upgrades
```

---

## 11. Monitoring ve Log Yönetimi

### 11.1. PM2 Monitoring

```bash
# PM2 monitoring dashboard
pm2 monit

# PM2 web interface (opsiyonel)
pm2 web
```

### 11.2. Log Dosyaları

```bash
# PM2 logları
pm2 logs

# Nginx logları
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Backend logları
tail -f /var/www/GrunerSuperStore/backend/logs/error.log
tail -f /var/www/GrunerSuperStore/backend/logs/out.log
```

---

## 12. Yedekleme Stratejisi

### 12.1. Veritabanı Yedekleme Script'i

```bash
# Yedekleme script'i oluştur
nano /root/backup-database.sh
```

İçeriği:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/gruner"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="gruner_superstore"
DB_USER="postgres"

mkdir -p $BACKUP_DIR

# Veritabanı yedeği
sudo -u postgres pg_dump $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Eski yedekleri sil (30 günden eski)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
```

```bash
# Script'e çalıştırma izni ver
chmod +x /root/backup-database.sh

# Cron job ekle (her gün saat 02:00'de)
crontab -e
# Şu satırı ekle:
0 2 * * * /root/backup-database.sh >> /var/log/backup.log 2>&1
```

### 12.2. Upload Klasörü Yedekleme

```bash
# Upload klasörü yedekleme script'i
nano /root/backup-uploads.sh
```

İçeriği:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/gruner"
DATE=$(date +%Y%m%d_%H%M%S)
UPLOAD_DIR="/var/www/GrunerSuperStore/backend/uploads"

mkdir -p $BACKUP_DIR

# Upload klasörü yedeği
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C $UPLOAD_DIR .

# Eski yedekleri sil (30 günden eski)
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +30 -delete

echo "Upload backup completed: $BACKUP_DIR/uploads_$DATE.tar.gz"
```

```bash
chmod +x /root/backup-uploads.sh

# Cron job ekle
crontab -e
# Şu satırı ekle:
0 3 * * * /root/backup-uploads.sh >> /var/log/backup.log 2>&1
```

---

## 13. Performans Optimizasyonu

### 13.1. Node.js Memory Limit

PM2 config'de zaten `max_memory_restart: '1G'` var, gerekirse artırılabilir.

### 13.2. PostgreSQL Optimizasyonu

```bash
# PostgreSQL config dosyasını düzenle
nano /etc/postgresql/*/main/postgresql.conf

# Önemli ayarlar:
# shared_buffers = 256MB
# effective_cache_size = 1GB
# maintenance_work_mem = 128MB
# checkpoint_completion_target = 0.9
# wal_buffers = 16MB
# default_statistics_target = 100
# random_page_cost = 1.1
# effective_io_concurrency = 200
# work_mem = 4MB
# min_wal_size = 1GB
# max_wal_size = 4GB

# PostgreSQL'i yeniden başlat
systemctl restart postgresql
```

---

## 14. Test ve Doğrulama

### 14.1. Backend Test

```bash
# Backend health check
curl http://localhost:5001/api/health

# PM2 durumu
pm2 status

# Backend logları
pm2 logs gruner-backend
```

### 14.2. Frontend Test

```bash
# Frontend dosyalarını kontrol et
ls -la /var/www/GrunerSuperStore/frontend/dist/

# Nginx test
nginx -t
```

### 14.3. Domain Test

Tarayıcıda şu adresleri test edin:
- https://gruner-super.store
- https://gruner-super.store/api/health

---

## 15. Sorun Giderme

### 15.1. PM2 Process Başlamıyor

```bash
# PM2 loglarını kontrol et
pm2 logs gruner-backend --lines 100

# Environment variable'ları kontrol et
pm2 env gruner-backend

# Manuel test
cd /var/www/GrunerSuperStore/backend
export $(cat .env | grep -v '^#' | xargs)
node src/server.js
```

### 15.2. Nginx 502 Bad Gateway

```bash
# Backend'in çalıştığını kontrol et
curl http://localhost:5001/api/health

# Port numarasını kontrol et
netstat -tlnp | grep 5001

# Nginx error loglarını kontrol et
tail -f /var/log/nginx/error.log
```

### 15.3. Veritabanı Bağlantı Hatası

```bash
# PostgreSQL'in çalıştığını kontrol et
systemctl status postgresql

# Veritabanının var olduğunu kontrol et
sudo -u postgres psql -l | grep gruner

# Bağlantı testi
sudo -u postgres psql -d gruner_superstore -c "SELECT 1;"
```

### 15.4. SSL Sertifika Sorunları

```bash
# Certbot durumunu kontrol et
certbot certificates

# Sertifikayı yenile
certbot renew

# Nginx SSL config'ini kontrol et
nginx -t
```

---

## 16. Güncelleme İşlemi

### 16.1. Kod Güncellemesi

```bash
cd /var/www/GrunerSuperStore

# Değişiklikleri çek
git pull origin main

# Backend bağımlılıklarını güncelle
cd backend
npm install

# Migration'ları çalıştır
export $(cat .env | grep -v '^#' | xargs)
npm run migrate

# Frontend build
cd ../frontend
npm install
npm run build

# PM2'yi yeniden başlat
cd ../backend
pm2 restart ecosystem.config.cjs
```

---

## 17. Ek Notlar

### 17.1. Tek Tenant Yapı

Bu kurulum tek tenant (single-tenant) yapısı için hazırlanmıştır. Multi-tenant yapı kullanmak isterseniz `MULTI_TENANT_SETUP.md` dosyasına bakın.

### 17.2. Önemli Dosya Yolları

- **Backend**: `/var/www/GrunerSuperStore/backend`
- **Frontend**: `/var/www/GrunerSuperStore/frontend`
- **Uploads**: `/var/www/GrunerSuperStore/backend/uploads`
- **Logs**: `/var/www/GrunerSuperStore/backend/logs`
- **Nginx Config**: `/etc/nginx/sites-available/gruner-super.store`
- **PM2 Config**: `/var/www/GrunerSuperStore/backend/ecosystem.config.cjs`
- **Environment File**: `/var/www/GrunerSuperStore/backend/.env`

### 17.3. Güvenlik Checklist

- [ ] Root şifresi güçlü ve güvenli
- [ ] SSH key-based authentication aktif
- [ ] Firewall (UFW) aktif ve yapılandırılmış
- [ ] SSL sertifikası kurulmuş ve otomatik yenileniyor
- [ ] Fail2Ban aktif
- [ ] Otomatik güvenlik güncellemeleri aktif
- [ ] Veritabanı yedekleme otomatik çalışıyor
- [ ] Upload klasörü yedekleme otomatik çalışıyor
- [ ] JWT_SECRET güçlü ve benzersiz
- [ ] Database şifreleri güçlü

---

## 18. Destek ve İletişim

Sorun yaşarsanız:
1. Log dosyalarını kontrol edin
2. PM2 durumunu kontrol edin: `pm2 status`
3. Nginx durumunu kontrol edin: `systemctl status nginx`
4. PostgreSQL durumunu kontrol edin: `systemctl status postgresql`

---

## Hızlı Komut Referansı

```bash
# PM2
pm2 status                    # Durum
pm2 logs                      # Loglar
pm2 restart all               # Tümünü yeniden başlat
pm2 stop all                  # Tümünü durdur
pm2 delete all                # Tümünü sil

# Nginx
nginx -t                      # Config test
systemctl reload nginx        # Reload
systemctl restart nginx       # Restart
tail -f /var/log/nginx/error.log  # Error log

# PostgreSQL
systemctl status postgresql   # Durum
sudo -u postgres psql         # PostgreSQL'e bağlan

# Sistem
df -h                         # Disk kullanımı
free -h                       # RAM kullanımı
top                           # Process listesi
```

---

**Kurulum tamamlandı! 🎉**

Artık https://gruner-super.store adresinden uygulamanıza erişebilirsiniz.

