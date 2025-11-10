# 🚀 Migration Sistemi - Hızlı Başlangıç

## Yeni Kolon/Tablo Eklerken

### 1. Migration Dosyası Oluştur

```bash
# Dosya adı: XXX_açıklama.sql (örn: 018_add_discount_column.sql)
touch backend/src/config/migrations/018_add_discount_column.sql
```

### 2. Migration İçeriğini Yaz

**ÖNEMLİ:** Her zaman `IF NOT EXISTS` kullan!

```sql
-- ✅ DOĞRU
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT NULL;

-- ❌ YANLIŞ (tekrar çalıştırılamaz)
ALTER TABLE products 
ADD COLUMN discount_percent DECIMAL(5,2);
```

### 3. Yerelde Test Et

```bash
cd backend

# Validation çalıştır (hata varsa gösterir)
npm run migrate:validate

# Migration'ı çalıştır
npm run migrate

# Durumu kontrol et
npm run migrate:status
```

### 4. Production'a Geç

```bash
# 1. Backup al (ZORUNLU!)
npm run db:dump

# 2. Durumu kontrol et
npm run migrate:status

# 3. Dry-run (sadece göster, çalıştırma)
npm run migrate:dry-run

# 4. Çalıştır
npm run migrate
```

---

## 📋 Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run migrate` | Bekleyen migration'ları çalıştır |
| `npm run migrate:status` | Migration durumunu göster |
| `npm run migrate:dry-run` | Ne yapılacağını göster (çalıştırma) |
| `npm run migrate:validate` | Migration'ları kontrol et |
| `npm run migrate:reset` | Tüm tabloları sil (DİKKAT!) |

---

## ⚠️ Önemli Kurallar

1. ✅ **Her zaman IF NOT EXISTS kullan**
2. ✅ **UPDATE/DELETE'de WHERE kullan**
3. ✅ **Production'a geçmeden önce backup al**
4. ✅ **Migration dosyalarını asla değiştirme**
5. ❌ **WHERE olmadan UPDATE/DELETE yapma**

---

## 📖 Detaylı Rehber

Daha fazla bilgi için: `backend/PRODUCTION_DEPLOYMENT.md`

