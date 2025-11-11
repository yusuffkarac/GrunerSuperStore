migra# Multi-Tenant Migration ve Kurulum Adımları

## Mevcut Müşteri: gruner-super.store
## Yeni Müşteri: meral.netwerkpro.de

---

## ADIM 1: Mevcut Müşteriyi Migrate Etme

### 1.1. Mevcut durumu kontrol edin
```bash
cd /var/www/gruner-superstore/backend
ls -la .env
ls -la uploads/
```

### 1.2. PM2 process'i durdurun
```bash
pm2 stop all
# veya
pm2 delete all
```

### 1.3. Migration script'ini çalıştırın
```bash
cd /var/www/gruner-superstore/backend
node scripts/migrate-existing-tenant.js gruner gruner-super.store 5001
```

Bu script:
- `.env` dosyasını `.env.gruner` olarak kopyalar
- Veritabanı adını `gruner_gruner` olarak değiştirir (eğer farklıysa)
- `uploads/` klasörünü `uploads/gruner/` olarak taşır
- `frontend/dist/` klasörünü `frontend/dist/gruner/` olarak taşır

### 1.4. .env.gruner dosyasını kontrol edin
```bash
cat .env.gruner | grep -E "(PORT|DB_NAME|CORS_ORIGIN|UPLOAD_PATH)"
```

Şunları kontrol edin:
- `PORT=5001` (veya mevcut port)
- `DB_NAME=gruner_gruner`
- `CORS_ORIGIN=https://gruner-super.store,http://gruner-super.store`
- `UPLOAD_PATH=uploads/gruner`

### 1.5. Frontend build yapın
```bash
cd /var/www/gruner-superstore/scripts
./build-tenant.sh gruner gruner-super.store
```

### 1.6. PM2'yi başlatın
```bash
cd /var/www/gruner-superstore
pm2 start ecosystem.config.js --only gruner-backend
pm2 save
```

### 1.7. Nginx config oluşturun
```bash
cd /var/www/gruner-superstore/scripts
./generate-nginx-config.sh gruner gruner-super.store 5001
sudo cp /tmp/nginx-gruner.conf /etc/nginx/sites-available/gruner-super.store
sudo ln -s /etc/nginx/sites-available/gruner-super.store /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## ADIM 2: Yeni Müşteriyi Ekleme

### 2.1. Yeni tenant oluşturun
```bash
cd /var/www/gruner-superstore/backend
node scripts/create-tenant.js meral meral.netwerkpro.de 5002
```

Bu script:
- Veritabanı oluşturur: `gruner_meral`
- `.env.meral` dosyası oluşturur
- `uploads/meral/` klasörlerini oluşturur
- Migration'ları çalıştırır

### 2.2. Frontend build yapın
```bash
cd /var/www/gruner-superstore/scripts
./build-tenant.sh meral meral.netwerkpro.de
```

### 2.3. PM2'yi güncelleyin
```bash
cd /var/www/gruner-superstore
pm2 start ecosystem.config.js --only meral-backend
pm2 save
```

### 2.4. Nginx config oluşturun
```bash
cd /var/www/gruner-superstore/scripts
./generate-nginx-config.sh meral meral.netwerkpro.de 5002
sudo cp /tmp/nginx-meral.conf /etc/nginx/sites-available/meral.netwerkpro.de
sudo ln -s /etc/nginx/sites-available/meral.netwerkpro.de /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## ADIM 3: Kontrol ve Test

### 3.1. PM2 durumunu kontrol edin
```bash
pm2 list
pm2 logs gruner-backend --lines 20
pm2 logs meral-backend --lines 20
```

### 3.2. Backend health check
```bash
curl http://localhost:5001/health
curl http://localhost:5002/health
```

### 3.3. Veritabanlarını kontrol edin
```bash
psql -U postgres -l | grep gruner
```

Şunları görmelisiniz:
- `gruner_gruner`
- `gruner_meral`

### 3.4. Tenant listesini görüntüleyin
```bash
cd /var/www/gruner-superstore/backend
node scripts/list-tenants.js
```

### 3.5. Web sitelerini test edin
- https://gruner-super.store
- https://meral.netwerkpro.de

---

## ADIM 4: SSL Sertifikaları (Opsiyonel ama Önerilen)

### 4.1. Let's Encrypt ile SSL alın
```bash
# Mevcut müşteri için
sudo certbot --nginx -d gruner-super.store

# Yeni müşteri için
sudo certbot --nginx -d meral.netwerkpro.de
```

### 4.2. Nginx config'lerinde SSL satırlarının yorumunu kaldırın
Her iki nginx config dosyasında SSL satırlarının başındaki `#` işaretlerini kaldırın.

---

## Özet Komutlar (Hızlı Referans)

```bash
# 1. Mevcut müşteriyi migrate et
cd /var/www/gruner-superstore/backend
pm2 stop all
node scripts/migrate-existing-tenant.js gruner gruner-super.store 5001
cd ../scripts
./build-tenant.sh gruner gruner-super.store
cd ..
pm2 start ecosystem.config.js --only gruner-backend

# 2. Yeni müşteriyi ekle
cd backend
node scripts/create-tenant.js meral meral.netwerkpro.de 5002
cd ../scripts
./build-tenant.sh meral meral.netwerkpro.de
cd ..
pm2 start ecosystem.config.js --only meral-backend

# 3. Nginx config'leri
cd scripts
./generate-nginx-config.sh gruner gruner-super.store 5001
./generate-nginx-config.sh meral meral.netwerkpro.de 5002
sudo cp /tmp/nginx-gruner.conf /etc/nginx/sites-available/gruner-super.store
sudo cp /tmp/nginx-meral.conf /etc/nginx/sites-available/meral.netwerkpro.de
sudo ln -s /etc/nginx/sites-available/gruner-super.store /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/meral.netwerkpro.de /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 4. Kontrol
pm2 list
cd backend && node scripts/list-tenants.js
```

---

## Sorun Giderme

### PM2 process başlamıyorsa:
```bash
pm2 logs gruner-backend
pm2 logs meral-backend
cat backend/.env.gruner | grep PORT
cat backend/.env.meral | grep PORT
```

### Nginx 502 hatası alıyorsanız:
```bash
# Backend'in çalıştığını kontrol edin
curl http://localhost:5001/health
curl http://localhost:5002/health

# Nginx config'deki port numaralarını kontrol edin
grep proxy_pass /etc/nginx/sites-available/gruner-super.store
grep proxy_pass /etc/nginx/sites-available/meral.netwerkpro.de
```

### Veritabanı bağlantı hatası:
```bash
# Veritabanlarının var olduğunu kontrol edin
psql -U postgres -l | grep gruner

# .env dosyalarını kontrol edin
cat backend/.env.gruner | grep DB_
cat backend/.env.meral | grep DB_
```

