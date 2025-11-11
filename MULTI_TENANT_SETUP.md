# Multi-Tenant Kurulum Dokümantasyonu

Bu dokümantasyon, aynı sunucuda birden fazla müşteri (tenant) için Gruner SuperStore uygulamasını çalıştırmak için gereken adımları açıklar.

## Genel Bakış

Multi-tenant yapı şu şekilde çalışır:
- Her tenant için ayrı **subdomain** (örn: `musteri1.superstore.com`)
- Her tenant için ayrı **PostgreSQL veritabanı** (örn: `gruner_musteri1`)
- Her tenant için ayrı **upload klasörü** (örn: `backend/uploads/musteri1/`)
- Her tenant için ayrı **backend port** (örn: 5001, 5002, 5003...)
- Her tenant için ayrı **PM2 process**
- **Nginx reverse proxy** ile subdomain'ler backend port'larına yönlendirilir

## Gereksinimler

- Node.js (v18+)
- PostgreSQL (v14+)
- PM2
- Nginx
- Git

## Mevcut Kurulu Müşteriyi Migrate Etme

Eğer zaten çalışan bir müşteriniz varsa ve bunu yeni multi-tenant yapıya uyarlamak istiyorsanız:

### Migration Script'i Kullanın

```bash
cd backend
node scripts/migrate-existing-tenant.js <tenant-name> <subdomain> [port]
```

Örnek:
```bash
node scripts/migrate-existing-tenant.js musteri1 musteri1.superstore.com 5002
```

Bu script şunları yapar:
1. Mevcut `.env` dosyasını `.env.{tenant-name}` formatına çevirir
2. Veritabanı adını `gruner_{tenant-name}` formatına değiştirir (eğer farklıysa)
3. `uploads/` klasörünü `uploads/{tenant-name}/` klasörüne taşır
4. `frontend/dist/` klasörünü `frontend/dist/{tenant-name}/` klasörüne taşır
5. Eski `.env` dosyasını yedekler

**Önemli Notlar:**
- Script çalışmadan önce onay ister
- Eski `.env` dosyası yedeklenir (`.env.backup.{timestamp}`)
- PM2 process'i durdurulmalı ve yeniden başlatılmalı
- Frontend build yapılmalı
- Nginx config oluşturulmalı

### Manuel Migration (Alternatif)

Eğer script kullanmak istemiyorsanız:

1. **Veritabanı adını değiştirin:**
   ```sql
   ALTER DATABASE gruner_superstore RENAME TO gruner_musteri1;
   ```

2. **.env dosyasını kopyalayın:**
   ```bash
   cp backend/.env backend/.env.musteri1
   ```

3. **.env.musteri1 dosyasını düzenleyin:**
   - `DB_NAME=gruner_musteri1`
   - `PORT=5002` (veya uygun port)
   - `CORS_ORIGIN=https://musteri1.superstore.com,http://musteri1.superstore.com`
   - `UPLOAD_PATH=uploads/musteri1`

4. **Upload klasörünü taşıyın:**
   ```bash
   mkdir -p backend/uploads/musteri1
   mv backend/uploads/* backend/uploads/musteri1/ 2>/dev/null || true
   ```

5. **Frontend dist klasörünü taşıyın:**
   ```bash
   mkdir -p frontend/dist/musteri1
   mv frontend/dist/* frontend/dist/musteri1/ 2>/dev/null || true
   ```

6. **PM2'yi güncelleyin:**
   ```bash
   pm2 delete all
   pm2 start ecosystem.config.js
   ```

## Kurulum Adımları

### 1. Projeyi Klonlayın ve Bağımlılıkları Yükleyin

```bash
git clone <repo-url>
cd GrunerSuperStore

# Backend bağımlılıkları
cd backend
npm install

# Frontend bağımlılıkları
cd ../frontend
npm install
```

### 2. Ana .env Dosyasını Oluşturun

Backend dizininde ana `.env` dosyasını oluşturun (master database bilgileri için):

```bash
cd backend
cp .env.example .env
nano .env
```

Gerekli değişkenler:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
# ... diğer environment variable'lar
```

### 3. İlk Tenant'ı Oluşturun

```bash
cd backend
node scripts/create-tenant.js <tenant-name> <subdomain> [port]
```

Örnek:
```bash
node scripts/create-tenant.js musteri1 musteri1.superstore.com 5002
```

Bu script şunları yapar:
- Veritabanı oluşturur (`gruner_musteri1`)
- `.env.musteri1` dosyası oluşturur
- Upload klasörlerini oluşturur (`uploads/musteri1/`)
- Migration'ları çalıştırır

### 4. PM2 Ecosystem Config'i Güncelleyin

PM2 config dosyası (`ecosystem.config.js`) otomatik olarak tenant'ları bulur ve yapılandırır. Yeni tenant ekledikten sonra PM2'yi yeniden başlatın:

```bash
pm2 delete all  # Tüm process'leri durdur
pm2 start ecosystem.config.js  # Tüm tenant'ları başlat
```

Veya sadece yeni tenant'ı başlatın:
```bash
pm2 start ecosystem.config.js --only musteri1-backend
```

### 5. Frontend Build Yapın

Her tenant için frontend build yapın:

```bash
cd frontend
TENANT_NAME=musteri1 VITE_API_URL=https://musteri1.superstore.com/api npm run build
```

Veya script kullanın:
```bash
cd scripts
./build-tenant.sh musteri1 musteri1.superstore.com
```

Build çıktısı `frontend/dist/musteri1/` klasörüne yazılacaktır.

### 6. Nginx Konfigürasyonu

#### Otomatik Config Oluşturma

```bash
cd scripts
./generate-nginx-config.sh musteri1 musteri1.superstore.com 5002
```

Bu script bir nginx config dosyası oluşturur. Sonraki adımlar:

```bash
# Config dosyasını kopyala
sudo cp /tmp/nginx-musteri1.conf /etc/nginx/sites-available/musteri1.superstore.com

# Symbolic link oluştur
sudo ln -s /etc/nginx/sites-available/musteri1.superstore.com /etc/nginx/sites-enabled/

# Nginx'i test et
sudo nginx -t

# Nginx'i reload et
sudo systemctl reload nginx
```

#### Manuel Config

`scripts/nginx-example.conf` dosyasını referans alarak manuel olarak da nginx config oluşturabilirsiniz.

### 7. SSL Sertifikası (Opsiyonel)

Let's Encrypt ile SSL sertifikası alın:

```bash
sudo certbot --nginx -d musteri1.superstore.com
```

Nginx config dosyasında SSL satırlarının yorumunu kaldırın.

## Tenant Yönetimi

### Tenant Listesi Görüntüleme

```bash
cd backend
node scripts/list-tenants.js
```

### Yeni Tenant Ekleme

```bash
cd backend
node scripts/create-tenant.js <tenant-name> <subdomain> [port]
```

### Tenant Silme

⚠️ **DİKKAT**: Bu işlem geri alınamaz!

```bash
cd backend
node scripts/delete-tenant.js <tenant-name> [--force]
```

Bu script şunları siler:
- Veritabanı
- .env dosyası
- Upload klasörü

**Manuel yapılması gerekenler:**
- PM2 process'i durdurun: `pm2 delete <tenant-name>-backend`
- PM2 ecosystem.config.js'den config'i kaldırın
- Nginx config'i kaldırın
- Frontend dist klasörünü silin

## Deployment

### Tek Tenant Deployment

```bash
cd scripts
./deploy-tenant.sh <tenant-name> [subdomain]
```

Bu script şunları yapar:
1. Backend migration çalıştırır
2. Frontend build yapar
3. PM2 process'i yeniden başlatır
4. Nginx config kontrolü yapar

### Tüm Tenant'ları Deploy Etme

```bash
# Her tenant için ayrı ayrı
cd scripts
./deploy-tenant.sh musteri1 musteri1.superstore.com
./deploy-tenant.sh musteri2 musteri2.superstore.com
```

## Dosya Yapısı

```
GrunerSuperStore/
├── backend/
│   ├── .env.{tenant-name}          # Her tenant için ayrı env
│   ├── uploads/
│   │   ├── {tenant-name}/          # Her tenant için ayrı upload klasörü
│   │   │   ├── products/
│   │   │   ├── categories/
│   │   │   ├── campaigns/
│   │   │   └── general/
│   ├── scripts/
│   │   ├── create-tenant.js
│   │   ├── list-tenants.js
│   │   └── delete-tenant.js
│   └── ...
├── frontend/
│   └── dist/
│       ├── {tenant-name}/           # Her tenant için ayrı build
│       └── ...
├── scripts/
│   ├── deploy-tenant.sh
│   ├── build-tenant.sh
│   ├── generate-nginx-config.sh
│   └── nginx-example.conf
└── ecosystem.config.js               # PM2 config
```

## Environment Variables

Her tenant için `.env.{tenant-name}` dosyasında şu değişkenler bulunur:

```env
NODE_ENV=production
PORT=5002                          # Tenant-specific port
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gruner_musteri1           # Tenant-specific database
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=tenant_specific_secret
CORS_ORIGIN=https://musteri1.superstore.com,http://musteri1.superstore.com
UPLOAD_PATH=uploads/musteri1      # Tenant-specific upload path
# ... diğer değişkenler
```

## Troubleshooting

### PM2 Process Başlamıyor

```bash
# PM2 loglarını kontrol et
pm2 logs <tenant-name>-backend

# .env dosyasını kontrol et
cat backend/.env.<tenant-name>

# PM2 config'i kontrol et
pm2 list
```

### Nginx 502 Bad Gateway

1. Backend'in çalıştığını kontrol edin:
   ```bash
   curl http://localhost:<port>/health
   ```

2. Port numarasını kontrol edin:
   ```bash
   # .env dosyasından
   grep PORT backend/.env.<tenant-name>
   ```

3. Nginx config'deki proxy_pass port'unu kontrol edin

### Veritabanı Bağlantı Hatası

1. Veritabanının var olduğunu kontrol edin:
   ```bash
   psql -U postgres -l | grep gruner_<tenant-name>
   ```

2. .env dosyasındaki DB bilgilerini kontrol edin

3. PostgreSQL'in çalıştığını kontrol edin:
   ```bash
   sudo systemctl status postgresql
   ```

### Frontend Build Hatası

1. Tenant name'in doğru olduğundan emin olun
2. API URL'in doğru olduğundan emin olun
3. Build çıktısını kontrol edin:
   ```bash
   ls -la frontend/dist/<tenant-name>/
   ```

## Güvenlik Notları

1. **Her tenant için farklı JWT_SECRET kullanın**
2. **Veritabanı şifrelerini güvenli tutun**
3. **Upload klasörlerinin izinlerini kontrol edin**
4. **Nginx security header'larını aktif tutun**
5. **SSL sertifikaları kullanın (production'da)**

## Performans İpuçları

1. **PM2 cluster mode**: Çok yüksek trafikli tenant'lar için PM2 cluster mode kullanabilirsiniz
2. **Nginx caching**: Static asset'ler için nginx cache kullanın
3. **Database connection pooling**: Her tenant için connection pool ayarlarını optimize edin
4. **CDN**: Upload edilen görseller için CDN kullanmayı düşünün

## Örnek Senaryo

### Senaryo: 3 Tenant Kurulumu

```bash
# 1. Tenant 1
cd backend
node scripts/create-tenant.js musteri1 musteri1.superstore.com 5002
cd ../scripts
./build-tenant.sh musteri1 musteri1.superstore.com
./generate-nginx-config.sh musteri1 musteri1.superstore.com 5002
sudo cp /tmp/nginx-musteri1.conf /etc/nginx/sites-available/musteri1.superstore.com
sudo ln -s /etc/nginx/sites-available/musteri1.superstore.com /etc/nginx/sites-enabled/

# 2. Tenant 2
cd backend
node scripts/create-tenant.js musteri2 musteri2.superstore.com 5003
cd ../scripts
./build-tenant.sh musteri2 musteri2.superstore.com
./generate-nginx-config.sh musteri2 musteri2.superstore.com 5003
sudo cp /tmp/nginx-musteri2.conf /etc/nginx/sites-available/musteri2.superstore.com
sudo ln -s /etc/nginx/sites-available/musteri2.superstore.com /etc/nginx/sites-enabled/

# 3. Tenant 3
cd backend
node scripts/create-tenant.js musteri3 musteri3.superstore.com 5004
cd ../scripts
./build-tenant.sh musteri3 musteri3.superstore.com
./generate-nginx-config.sh musteri3 musteri3.superstore.com 5004
sudo cp /tmp/nginx-musteri3.conf /etc/nginx/sites-available/musteri3.superstore.com
sudo ln -s /etc/nginx/sites-available/musteri3.superstore.com /etc/nginx/sites-enabled/

# 4. PM2'yi başlat
cd ..
pm2 start ecosystem.config.js

# 5. Nginx'i reload et
sudo nginx -t
sudo systemctl reload nginx
```

## Destek

Sorularınız için:
- GitHub Issues
- Dokümantasyonu kontrol edin
- Log dosyalarını inceleyin: `pm2 logs`

