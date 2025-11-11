# Prisma Client Hatası Düzeltme Rehberi

## Sorun
Sunucuda `@prisma/client` paketi bulunamıyor hatası alınıyor.

## Çözüm Adımları

### 1. Sunucuya SSH ile bağlanın
```bash
ssh root@your-server-ip
```

### 2. Proje dizinine gidin
```bash
cd /var/www/gruner-superstore/backend
```

### 3. PM2 process'lerini durdurun
```bash
pm2 stop all
# veya belirli bir process için:
# pm2 stop gruner-backend
```

### 4. Bağımlılıkları yükleyin
```bash
npm install
```

Bu komut otomatik olarak `postinstall` script'ini çalıştıracak ve Prisma client'ı generate edecek.

### 5. Eğer Prisma client hala generate edilmediyse manuel olarak çalıştırın
```bash
npx prisma generate
```

### 6. PM2 process'lerini yeniden başlatın
```bash
pm2 restart all
# veya ecosystem config kullanıyorsanız:
pm2 restart ecosystem.config.cjs
```

### 7. Logları kontrol edin
```bash
pm2 logs backend --lines 50
# veya
tail -f /root/.pm2/logs/backend-error.log
```

## Kontrol Komutları

### Prisma client'ın doğru generate edildiğini kontrol edin:
```bash
ls -la node_modules/.prisma/client/
```

### PM2 durumunu kontrol edin:
```bash
pm2 status
pm2 list
```

## Notlar
- `@prisma/client` artık `dependencies` içinde, bu yüzden production'da yüklenecek
- `postinstall` script'i sayesinde her `npm install` sonrası Prisma client otomatik generate edilecek
- Eğer hala sorun yaşıyorsanız, `node_modules` klasörünü silip yeniden yükleyin:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

---

# Port Çakışması Hatası Düzeltme (EADDRINUSE)

## Sorun
`Error: listen EADDRINUSE: address already in use 0.0.0.0:5001` hatası alınıyor.

Bu hata, port 5001'in zaten başka bir process tarafından kullanıldığını gösterir.

## Çözüm Adımları

### 1. PM2'deki tüm process'leri kontrol edin
```bash
pm2 list
pm2 status
```

### 2. Port 5001'i kullanan process'i bulun
```bash
# Linux'ta port kullanan process'i bulma
sudo lsof -i :5001
# veya
sudo netstat -tulpn | grep 5001
# veya
sudo ss -tulpn | grep 5001
```

### 3. PM2'deki duplicate/zombie process'leri temizleyin

#### Tüm PM2 process'lerini durdurun:
```bash
pm2 stop all
```

#### PM2'deki tüm process'leri silin (dikkatli olun!):
```bash
pm2 delete all
```

#### Eğer belirli bir process'i silmek istiyorsanız:
```bash
pm2 delete gruner-backend
pm2 delete gruner-
```

### 4. Manuel olarak çalışan Node.js process'lerini bulun ve durdurun
```bash
# Tüm Node.js process'lerini göster
ps aux | grep node

# Port 5001'i kullanan process'in PID'sini bulun ve durdurun
# Örnek: PID 12345 ise
kill -9 12345
```

### 5. PM2'yi temizleyin ve yeniden başlatın
```bash
# PM2'yi resetleyin
pm2 kill
pm2 resurrect  # Eğer PM2 save yapılmışsa

# Veya ecosystem config ile yeniden başlatın
cd /var/www/gruner-superstore
pm2 start ecosystem.config.cjs
```

### 6. Alternatif: Farklı bir port kullanın

Eğer port 5001'i başka bir servis kullanıyorsa, `.env` dosyasında PORT değişkenini değiştirebilirsiniz:

```bash
cd /var/www/gruner-superstore/backend
nano .env.gruner  # veya ilgili .env dosyası
```

Şu satırı ekleyin veya güncelleyin:
```
PORT=5002
```

Sonra PM2'yi yeniden başlatın:
```bash
pm2 restart all
```

### 7. Kontrol edin
```bash
# PM2 durumunu kontrol edin
pm2 status

# Logları kontrol edin
pm2 logs gruner-backend --lines 50

# Port'un kullanıldığını doğrulayın
sudo lsof -i :5001
```

## Önleme İçin Öneriler

1. **PM2'yi düzgün kullanın**: Process'leri durdururken `pm2 stop` yerine `pm2 delete` kullanmayın (eğer process'i tamamen kaldırmak istemiyorsanız).

2. **Graceful shutdown**: Server kodunda graceful shutdown ekleyin (zaten var gibi görünüyor).

3. **PM2 save**: Process'leri kaydedin:
   ```bash
   pm2 save
   pm2 startup  # Sistem başlangıcında otomatik başlatma için
   ```

4. **Port kontrolü**: Server başlatmadan önce port'un boş olduğundan emin olun.

---

# Veritabanı Hatası Düzeltme (Datenbankfehler)

## Sorun
`{"success":false,"message":"Datenbankfehler"}` hatası alınıyor.

Bu hata genellikle:
- Migration'ların çalıştırılmamış olması
- Prisma client'ın yeniden generate edilmemiş olması
- Veritabanı şeması ile kod arasında uyumsuzluk

## Çözüm Adımları

### 1. Sunucu loglarını kontrol edin

```bash
# PM2 loglarını kontrol edin
pm2 logs gruner-backend --lines 100

# Veya error log dosyasını kontrol edin
tail -f /var/www/gruner-superstore/backend/logs/gruner-error.log

# Veya PM2 log dosyasını kontrol edin
tail -f /root/.pm2/logs/gruner-backend-error.log
```

Artık loglarda daha detaylı hata mesajları göreceksiniz (kolon adı, Prisma error code, vb.)

### 2. Migration durumunu kontrol edin

```bash
cd /var/www/gruner-superstore/backend

# Migration durumunu kontrol edin
npm run migrate:status

# Veya manuel kontrol
node src/config/runMigrations.js status
```

### 3. Eksik migration'ları çalıştırın

```bash
cd /var/www/gruner-superstore/backend

# Tüm migration'ları çalıştırın
npm run migrate

# Veya manuel olarak
node src/config/runMigrations.js run
```

### 4. Prisma Client'ı yeniden generate edin

```bash
cd /var/www/gruner-superstore/backend

# Prisma client klasörünün varlığını kontrol edin
ls -la node_modules/.prisma/client/

# Eğer yoksa veya güncel değilse, generate edin
npx prisma generate
```

### 5. Veritabanı bağlantısını test edin

```bash
cd /var/www/gruner-superstore/backend

# Prisma ile veritabanı bağlantısını test edin
npx prisma db pull

# Veya basit bir test script'i çalıştırın
node -e "
import prisma from './src/config/prisma.js';
try {
  await prisma.\$queryRaw\`SELECT 1\`;
  console.log('✅ Database connection OK');
} catch (e) {
  console.error('❌ Database connection FAILED:', e.message);
} finally {
  await prisma.\$disconnect();
}
"
```

### 6. Veritabanında kolonların varlığını kontrol edin

```bash
# PostgreSQL'e bağlanın
psql -h localhost -U gruner_user -d gruner_superstore

# Products tablosundaki kolonları kontrol edin
\d products

# Özellikle şu kolonların varlığını kontrol edin:
# - low_stock_level
# - supplier
# - temporary_price
# - temporary_price_end_date
# - expiry_date
# - exclude_from_expiry_check

# Çıkış için
\q
```

Eğer kolonlar eksikse, migration'ları çalıştırmanız gerekiyor.

### 7. Environment variable'ları kontrol edin

```bash
cd /var/www/gruner-superstore/backend

# PM2 process'inin environment variable'larını kontrol edin
pm2 env 0  # 0 yerine process ID'nizi kullanın

# Veya .env dosyasını kontrol edin
cat .env.gruner  # veya ilgili .env dosyası
```

Şu değişkenlerin doğru olduğundan emin olun:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DATABASE_URL` (otomatik oluşturulur)

### 8. Veritabanı servisinin çalıştığını kontrol edin

```bash
# PostgreSQL servisinin durumunu kontrol edin
sudo systemctl status postgresql

# Veya Docker kullanıyorsanız
docker ps | grep postgres

# Veritabanına bağlanmayı test edin
psql -h localhost -U gruner_user -d gruner_superstore
```

### 9. PM2'yi yeniden başlatın

```bash
pm2 restart gruner-backend

# Logları tekrar kontrol edin
pm2 logs gruner-backend --lines 50
```

## Yaygın Hata Senaryoları ve Çözümleri

### Senaryo 1: "column does not exist" hatası

**Sorun**: Veritabanında kolon eksik (örn: `low_stock_level`, `supplier`)

**Çözüm**:
```bash
cd /var/www/gruner-superstore/backend
npm run migrate
npx prisma generate
pm2 restart gruner-backend
```

### Senaryo 2: Prisma Client eski

**Sorun**: Prisma client generate edilmemiş veya güncel değil

**Çözüm**:
```bash
cd /var/www/gruner-superstore/backend
rm -rf node_modules/.prisma
npx prisma generate
pm2 restart gruner-backend
```

### Senaryo 3: Migration'lar çalıştırılmamış

**Sorun**: Yeni kolonlar eklenmiş ama migration'lar sunucuda çalıştırılmamış

**Çözüm**:
```bash
cd /var/www/gruner-superstore/backend
npm run migrate:status  # Durumu kontrol et
npm run migrate         # Migration'ları çalıştır
npx prisma generate     # Client'ı güncelle
pm2 restart gruner-backend
```

## Debug İçin Öneriler

1. **Error handler güncellendi**: Artık production'da da Prisma hataları detaylı loglanıyor
2. **Logları kontrol edin**: Sunucu loglarında daha fazla bilgi göreceksiniz (error code, kolon adı, vb.)
3. **Development modunda test edin**: `NODE_ENV=development` ile daha detaylı hata mesajları alırsınız
4. **Migration status**: Her zaman migration durumunu kontrol edin: `npm run migrate:status`

## Hızlı Çözüm (Tüm Adımlar)

```bash
cd /var/www/gruner-superstore/backend

# 1. Migration'ları çalıştır
npm run migrate

# 2. Prisma client'ı generate et
npx prisma generate

# 3. PM2'yi yeniden başlat
pm2 restart gruner-backend

# 4. Logları kontrol et
pm2 logs gruner-backend --lines 50
```

