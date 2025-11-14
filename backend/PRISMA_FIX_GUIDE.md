# 🔧 Prisma Client Cache Sorunları - Kalıcı Çözüm

## Problem

Yeni kolon ekledikten sonra Prisma Client hataları alıyorsunuz:
```
Invalid `prisma.product.findMany()` invocation
Unknown field `hideFromExpiryManagement`
```

Bu sorun genellikle:
- Prisma Client cache'inin güncel olmaması
- Server'ın eski Prisma Client'ı kullanması
- `prisma generate` çalıştırılsa bile cache'in temizlenmemesi

## ✅ Kalıcı Çözüm

### Otomatik Çözüm (Önerilen)

```bash
cd backend
npm run fix:prisma
```

veya

```bash
npm run prisma:refresh
```

Bu komut otomatik olarak:
1. ✅ Prisma Client cache'ini temizler
2. ✅ Prisma Client'ı yeniden generate eder
3. ✅ PM2 ile çalışıyorsa server'ı yeniden başlatır

### Manuel Çözüm

Eğer script çalışmazsa:

```bash
cd backend

# 1. Cache'i temizle
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client/.prisma

# 2. Prisma Client'ı generate et
npx prisma generate

# 3. Server'ı yeniden başlat (PM2 varsa)
pm2 restart gruner-backend

# veya development için
# Ctrl+C ile durdur, sonra npm run dev ile başlat
```

## 📋 Yeni Kolon Eklerken İzlenecek Adımlar

### 1. Schema'yı Güncelle
```prisma
// backend/prisma/schema.prisma
model Product {
  // ...
  hideFromExpiryManagement Boolean @default(false) @map("hide_from_expiry_management")
}
```

### 2. Migration Oluştur
```bash
cd backend
npx prisma migrate dev --name add_hide_from_expiry_management
```

Eğer migration hatası alırsanız, manuel SQL:
```sql
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS hide_from_expiry_management BOOLEAN NOT NULL DEFAULT false;
```

### 3. Prisma Client'ı Güncelle
```bash
npm run fix:prisma
```

### 4. Server'ı Yeniden Başlat
```bash
# PM2 ile
pm2 restart gruner-backend

# veya development
npm run dev
```

## 🚨 Sık Karşılaşılan Sorunlar

### Sorun: "Unknown field" hatası

**Çözüm:**
```bash
npm run fix:prisma
```

### Sorun: Migration hatası (shadow database)

**Çözüm:** Manuel SQL çalıştır:
```bash
psql $DATABASE_URL -c "ALTER TABLE products ADD COLUMN IF NOT EXISTS hide_from_expiry_management BOOLEAN NOT NULL DEFAULT false;"
npm run fix:prisma
```

### Sorun: PM2 process yeniden başlamıyor

**Çözüm:** Manuel başlat:
```bash
pm2 restart gruner-backend
# veya
pm2 restart all
```

## 💡 İpuçları

1. **Her zaman `npm run fix:prisma` çalıştırın** - Yeni kolon ekledikten sonra
2. **Server'ı yeniden başlatın** - Prisma Client değişiklikleri için gerekli
3. **Cache'i temizleyin** - Eğer hala sorun varsa
4. **Migration'ları kontrol edin** - `npm run migrate:status`

## 📝 Script Detayları

Script şunları yapar:
- `node_modules/.prisma` klasörünü siler (cache)
- `node_modules/@prisma/client/.prisma` klasörünü siler
- `npx prisma generate` çalıştırır
- PM2 process'ini yeniden başlatır (varsa)

Script'i manuel çalıştırmak için:
```bash
node scripts/fix-prisma-client.js
```

