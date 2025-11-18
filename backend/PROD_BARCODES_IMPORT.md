# Prod Sunucuda Barcodes.json Import Rehberi

Bu rehber, prod sunucuda güncellenmiş `barcodes.json` dosyasını veritabanına aktarmak için gereken adımları açıklar.

## 📋 Ön Gereksinimler

1. ✅ `barcodes.json` dosyası prod sunucuda `backend/frontend/barcodes.json` konumunda olmalı
2. ✅ İlgili tenant'ın `.env` dosyası mevcut olmalı (örn: `.env.gruner`, `.env.meral`)
3. ✅ Veritabanı bağlantısı çalışıyor olmalı

## 🚀 Adım Adım İşlem

### 1. Sunucuya Bağlan

```bash
ssh kullanici@sunucu-ip
```

### 2. Proje Dizinine Git

```bash
cd /path/to/GrunerLocal/backend
```

### 3. Hangi Tenant İçin Çalıştıracağınızı Belirleyin

Multi-tenant yapıda her tenant için ayrı `.env` dosyası var:
- `.env.gruner` → `gruner_gruner` veritabanı
- `.env.meral` → `gruner_meral` veritabanı
- vb.

### 4. Import Script'ini Çalıştır

#### Seçenek A: Ürünleri Import Et (Önerilen)

Bu script, `barcodes.json`'daki ürünleri `products` tablosuna ekler:

```bash
# Gruner tenant için
DB_NAME=gruner_gruner DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_PASSWORD=your_password node src/scripts/importProducts.js

# Veya .env dosyasını yükleyerek
source .env.gruner && node src/scripts/importProducts.js
```

**Daha kolay yöntem (PM2 ecosystem kullanarak):**
```bash
# Ecosystem dosyasında tanımlı environment variable'ları kullan
pm2 exec gruner -- node src/scripts/importProducts.js
```

#### Seçenek B: Sadece Barkod Etiketlerini Import Et

Eğer sadece barkod etiketlerini eklemek istiyorsanız:

```bash
source .env.gruner && node src/scripts/importBarcodeLabels.js
```

#### Seçenek C: Vergi Oranlarını Güncelle

Eğer sadece vergi oranlarını güncellemek istiyorsanız:

```bash
source .env.gruner && node src/scripts/updateTaxRates.js
```

### 5. Script Çıktısını İncele

Script çalışırken şu bilgileri göreceksiniz:
- ✅ Başarıyla eklenen ürün sayısı
- ⏭️ Atlanan ürün sayısı ve sebepleri
- 🔄 Duplicate kayıtlar
- ❌ Hatalar (varsa)

## 📊 Script Özellikleri

### importProducts.js
- **Duplicate kontrolü:** Aynı slug veya barcode varsa atlar veya unique yapar
- **Kategori mapping:** `category-mapping.json` dosyası varsa kullanır, yoksa default kategoriye atar
- **Batch processing:** 50'şer ürün halinde toplu ekleme yapar
- **Progress tracking:** İşlem sırasında ilerleme gösterir

### importBarcodeLabels.js
- Sadece barkod etiketlerini `barcodeLabels` tablosuna ekler
- Duplicate barkodları atlar

### updateTaxRates.js
- Mevcut ürünlerin vergi oranlarını `barcodes.json`'dan günceller
- Önce tüm vergi oranlarını siler, sonra yeniden ekler

## ⚠️ Önemli Notlar

1. **Veri Kaybı Riski:** 
   - `importProducts.js` yeni ürünler ekler, mevcut ürünleri güncellemez
   - Duplicate slug/barcode varsa atlar
   - Eğer mevcut ürünleri güncellemek istiyorsanız, önce mevcut ürünleri kontrol edin

2. **Kategori Mapping:**
   - Eğer kategori mapping kullanmak istiyorsanız, `backend/category-mapping.json` dosyasını oluşturun
   - Format: `{ "odoo_category_id": "uuid" }`

3. **Büyük Dosyalar:**
   - `barcodes.json` çok büyükse (100k+ satır), script uzun sürebilir
   - İşlem sırasında sunucu bağlantısının kopmaması için `screen` veya `tmux` kullanın

4. **Backup:**
   - İşlem öncesi veritabanı yedeği alın:
   ```bash
   npm run db:dump
   ```

## 🔍 Sorun Giderme

### "barcodes.json dosyası bulunamadı" hatası
```bash
# Dosyanın konumunu kontrol edin
ls -la frontend/barcodes.json

# Dosya yoksa, doğru konuma kopyalayın
cp /path/to/barcodes.json frontend/barcodes.json
```

### "Kategori bulunamadı" hatası
- Default kategori otomatik oluşturulur
- Eğer kategori mapping kullanıyorsanız, `category-mapping.json` dosyasını kontrol edin

### "Duplicate slug" hatası
- Script otomatik olarak unique slug oluşturur (`slug-1`, `slug-2`, vb.)
- Bu normal bir durumdur, hata değildir

### Veritabanı bağlantı hatası
- `.env` dosyasındaki `DB_*` değişkenlerini kontrol edin
- Veritabanı servisinin çalıştığından emin olun:
  ```bash
  sudo systemctl status postgresql
  ```

## 📝 Örnek Kullanım Senaryoları

### Senaryo 1: Yeni Ürünleri Ekle
```bash
# 1. barcodes.json dosyasını güncelle
# 2. Import script'ini çalıştır
source .env.gruner && node src/scripts/importProducts.js
```

### Senaryo 2: Sadece Vergi Oranlarını Güncelle
```bash
source .env.gruner && node src/scripts/updateTaxRates.js
```

### Senaryo 3: Hem Ürünleri Hem Vergi Oranlarını Güncelle
```bash
# Önce ürünleri ekle
source .env.gruner && node src/scripts/importProducts.js

# Sonra vergi oranlarını güncelle
source .env.gruner && node src/scripts/updateTaxRates.js
```

## 🔄 PM2 ile Çalıştırma (Önerilen)

Eğer PM2 ecosystem kullanıyorsanız, environment variable'lar otomatik yüklenir:

```bash
# Ecosystem dosyasındaki environment variable'ları kullan
pm2 exec gruner -- node src/scripts/importProducts.js
```

Bu yöntem daha güvenlidir çünkü doğru environment variable'ları otomatik kullanır.

## 📚 İlgili Dosyalar

- `backend/src/scripts/importProducts.js` - Ana import script'i
- `backend/src/scripts/importBarcodeLabels.js` - Barkod etiketleri import script'i
- `backend/src/scripts/updateTaxRates.js` - Vergi oranları güncelleme script'i
- `backend/IMPORT_PRODUCTS_README.md` - Detaylı kullanım kılavuzu
- `backend/VERI_ESLESTIRME.md` - Veri eşleştirme rehberi

