# Sunucuda Prisma ve PM2 Sorunları - Çözüm Rehberi

## Sorun 1: Prisma Client Güncel Değil

**Hata:** `Unknown field 'roleId' for select statement on model 'Admin'`

**Sebep:** Prisma schema güncellenmiş ama Prisma Client yeniden generate edilmemiş.

**Çözüm:**

```bash
cd /var/www/gruner-superstore/backend

# Prisma Client'ı yeniden generate et
npx prisma generate

# PM2'yi yeniden başlat
pm2 restart gruner-backend
# veya
pm2 restart backend
```

## Sorun 2: Port 5001 Zaten Kullanımda

**Hata:** `EADDRINUSE: address already in use 0.0.0.0:5001`

**Sebep:** PM2'de zaten bir process çalışıyor.

**Çözüm:**

```bash
# Çalışan process'leri listele
pm2 list

# Tüm process'leri durdur
pm2 stop all

# Veya belirli process'i durdur
pm2 stop gruner-backend
pm2 stop backend

# Process'leri sil (gerekirse)
pm2 delete gruner-backend
pm2 delete backend

# Yeniden başlat
cd /var/www/gruner-superstore/backend
pm2 start npm --name "gruner-backend" -- start
# veya
pm2 start src/server.js --name "gruner-backend"
```

## Tam Çözüm Adımları

```bash
# 1. Proje dizinine git
cd /var/www/gruner-superstore/backend

# 2. Prisma Client'ı generate et
npx prisma generate

# 3. PM2 process'lerini kontrol et
pm2 list

# 4. Eski process'leri durdur
pm2 stop all
pm2 delete all

# 5. Uygulamayı yeniden başlat
pm2 start npm --name "gruner-backend" -- start

# 6. Logları kontrol et
pm2 logs gruner-backend --lines 50
```

## Alternatif: PM2 Ecosystem Dosyası Kullan

Eğer PM2 ecosystem dosyası varsa:

```bash
cd /var/www/gruner-superstore
pm2 restart ecosystem.config.js
```

## Kontrol

```bash
# Process durumunu kontrol et
pm2 status

# Logları izle
pm2 logs gruner-backend

# Process bilgilerini göster
pm2 show gruner-backend
```

