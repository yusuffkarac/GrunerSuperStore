# Production Deployment Rehberi - Database Migrations

Bu rehber, yerel ortamda yaptığınız veritabanı değişikliklerini canlıya (production) güvenli bir şekilde geçirmeniz için adım adım talimatlar içerir.

## 🎯 Amaç

Yerel ortamda yaptığınız kolon ekleme, tablo oluşturma gibi değişikliklerin canlıya geçişinde sorun yaşamamak için:

1. ✅ Migration tracking sistemi (hangi migration'ların çalıştırıldığını takip eder)
2. ✅ Idempotent migrations (tekrar çalıştırılsa bile sorun çıkarmaz)
3. ✅ Validation script'i (production'a geçmeden önce kontrol eder)
4. ✅ Güvenli deployment süreci

---

## 📋 Ön Hazırlık (Yerel Ortam)

### 1. Yeni Migration Dosyası Oluşturma

Yeni bir kolon veya tablo eklerken:

```bash
# Yeni migration dosyası oluştur
# Dosya adı formatı: XXX_description.sql (örn: 018_add_new_column.sql)
touch backend/src/config/migrations/018_add_new_column.sql
```

### 2. Migration Dosyasını Yazma

**ÖNEMLİ:** Her zaman idempotent (tekrar çalıştırılabilir) olmalı:

```sql
-- ✅ DOĞRU: IF NOT EXISTS kullan
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);

-- ❌ YANLIŞ: IF NOT EXISTS yok
ALTER TABLE products 
ADD COLUMN new_column VARCHAR(255);
```

**Güvenli Migration Örnekleri:**

```sql
-- Kolon ekleme
ALTER TABLE table_name 
ADD COLUMN IF NOT EXISTS column_name VARCHAR(255) DEFAULT NULL;

-- Index ekleme
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column_name);

-- Tablo oluşturma
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
);

-- Kolon silme (dikkatli!)
ALTER TABLE table_name 
DROP COLUMN IF EXISTS column_name;

-- Veri güncelleme (mutlaka WHERE kullan!)
UPDATE table_name 
SET column = value 
WHERE condition;  -- WHERE olmadan çalıştırma!
```

### 3. Migration'ı Test Etme

```bash
# Yerel veritabanında test et
cd backend
npm run migrate

# Migration durumunu kontrol et
npm run migrate:status

# Dry-run (sadece göster, çalıştırma)
npm run migrate:dry-run
```

### 4. Validation (Zorunlu!)

Production'a geçmeden önce mutlaka validation çalıştır:

```bash
npm run migrate:validate
```

Bu script şunları kontrol eder:
- ✅ Dosya adlandırma kuralları
- ✅ Idempotency (IF NOT EXISTS kullanımı)
- ✅ Transaction güvenliği
- ✅ Veri güvenliği (UPDATE/DELETE WHERE kontrolü)
- ✅ SQL syntax hataları

**Eğer validation hata verirse, mutlaka düzelt!**

---

## 🚀 Production Deployment Süreci

### Adım 1: Backup Al (ZORUNLU!)

```bash
# Production veritabanından backup al
npm run db:dump

# Backup dosyasının yerini not et
# backend/database-dumps/dump_gruner_superstore_YYYY-MM-DD_HHMMSS.sql
```

**⚠️ ÖNEMLİ:** Backup almadan migration çalıştırma!

### Adım 2: Migration Durumunu Kontrol Et

```bash
# Production ortamında migration durumunu kontrol et
npm run migrate:status
```

Bu komut şunları gösterir:
- Hangi migration'lar çalıştırılmış
- Hangi migration'lar bekliyor
- Başarısız migration'lar varsa

### Adım 3: Dry-Run Yap

```bash
# Production'da ne yapılacağını göster (değişiklik yapmaz)
npm run migrate:dry-run
```

Bu komut sadece gösterir, hiçbir değişiklik yapmaz. Mutlaka kontrol et!

### Adım 4: Migration'ları Çalıştır

```bash
# Production'da migration'ları çalıştır
npm run migrate
```

Migration runner otomatik olarak:
- ✅ Sadece çalıştırılmamış migration'ları çalıştırır
- ✅ Her migration'ı transaction içinde çalıştırır
- ✅ Başarısız olursa rollback yapar
- ✅ Hangi migration'ların çalıştırıldığını kaydeder

### Adım 5: Doğrulama

```bash
# Migration durumunu tekrar kontrol et
npm run migrate:status

# Uygulamanın çalıştığını kontrol et
# API endpoint'lerini test et
```

---

## 🔧 Sorun Giderme

### Sorun: "Migration already executed" hatası

**Çözüm:** Bu normal bir durum. Migration tracking sistemi aynı migration'ı tekrar çalıştırmaz.

### Sorun: "Migration has been modified" uyarısı

**Çözüm:** Migration dosyası değiştirilmiş. İki seçenek:
1. Yeni bir migration dosyası oluştur (önerilen)
2. `--force` flag'i kullan (dikkatli!)

```bash
npm run migrate -- --force
```

### Sorun: Migration başarısız oldu

**Çözüm:**
1. Hata mesajını oku
2. Backup'tan geri yükle (gerekirse)
3. Migration dosyasını düzelt
4. Tekrar dene

### Sorun: Production'da kolon zaten var

**Çözüm:** Migration dosyasında `IF NOT EXISTS` kullan:

```sql
ALTER TABLE table_name 
ADD COLUMN IF NOT EXISTS column_name VARCHAR(255);
```

---

## 📝 Best Practices

### ✅ YAPILMASI GEREKENLER

1. **Her zaman IF NOT EXISTS / IF EXISTS kullan**
   ```sql
   CREATE TABLE IF NOT EXISTS ...
   ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
   CREATE INDEX IF NOT EXISTS ...
   ```

2. **UPDATE/DELETE'de mutlaka WHERE kullan**
   ```sql
   UPDATE table SET column = value WHERE id = 1;  -- ✅
   UPDATE table SET column = value;  -- ❌ TÜM SATIRLARI GÜNCELLER!
   ```

3. **Migration dosyalarını küçük tut**
   - Her migration tek bir değişiklik yapsın
   - Büyük değişiklikleri birden fazla migration'a böl

4. **Migration dosyalarını asla değiştirme**
   - Çalıştırılmış migration'ları değiştirme
   - Yeni bir migration dosyası oluştur

5. **Her zaman backup al**
   - Production'a geçmeden önce mutlaka backup al
   - Backup'ı güvenli bir yerde sakla

### ❌ YAPILMAMASI GEREKENLER

1. **Çalıştırılmış migration'ları değiştirme**
   - Migration tracking sistemi bunu tespit eder ve uyarır
   - Yeni bir migration dosyası oluştur

2. **WHERE olmadan UPDATE/DELETE**
   - Tüm veriyi silebilir/güncelleyebilir
   - Validation script'i bunu yakalar

3. **IF NOT EXISTS olmadan CREATE/ALTER**
   - Migration tekrar çalıştırılamaz
   - Production'da hata verir

4. **Transaction içinde COMMIT/ROLLBACK**
   - Migration runner zaten transaction yönetir
   - Manuel COMMIT/ROLLBACK kullanma

---

## 🎓 Örnek Senaryolar

### Senaryo 1: Yeni Kolon Ekleme

```bash
# 1. Migration dosyası oluştur
# backend/src/config/migrations/018_add_discount_column.sql

# 2. İçeriği yaz
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT NULL;

# 3. Yerelde test et
npm run migrate:validate
npm run migrate

# 4. Production'a geç
npm run db:dump  # Backup al
npm run migrate:status  # Durumu kontrol et
npm run migrate:dry-run  # Ne yapılacağını gör
npm run migrate  # Çalıştır
```

### Senaryo 2: Tablo Oluşturma

```sql
-- backend/src/config/migrations/019_create_reviews_table.sql
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  user_id UUID NOT NULL REFERENCES users(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
```

### Senaryo 3: Veri Migrasyonu

```sql
-- backend/src/config/migrations/020_migrate_old_data.sql
-- Eski verileri yeni formata çevir

UPDATE products 
SET new_column = old_column 
WHERE old_column IS NOT NULL 
AND new_column IS NULL;  -- WHERE mutlaka var!
```

---

## 📞 Destek

Sorun yaşarsanız:

1. `npm run migrate:status` ile durumu kontrol edin
2. `npm run migrate:validate` ile validation çalıştırın
3. Hata mesajlarını dikkatlice okuyun
4. Backup'tan geri yükleyin (gerekirse)

---

**Son Güncelleme:** 2025-01-17  
**Versiyon:** 1.0

