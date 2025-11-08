# Ürün Import Script'i Kullanım Kılavuzu

Bu script, `barcodes.json` dosyasındaki ürün verilerini `products` tablosuna aktarır.

## 📋 Ön Gereksinimler

1. Veritabanı bağlantısı yapılandırılmış olmalı (`.env` dosyasında `DATABASE_URL`)
2. `barcodes.json` dosyası `backend/frontend/barcodes.json` konumunda olmalı
3. Kategoriler veritabanında mevcut olmalı (opsiyonel: category mapping)

## 🚀 Kullanım

### Basit Kullanım (Default Kategori ile)

```bash
npm run import-products
```

Script otomatik olarak:
- Default kategoriyi bulur veya oluşturur ("Genel")
- Tüm ürünleri bu kategoriye atar

### Gelişmiş Kullanım (Category Mapping ile)

1. **Kategori mapping dosyası oluştur:**

```bash
cp category-mapping.example.json category-mapping.json
```

2. **Mapping dosyasını düzenle:**

```json
{
  "8": "550e8400-e29b-41d4-a716-446655440000",
  "9": "660e8400-e29b-41d4-a716-446655440001"
}
```

Burada:
- Sol taraf: Odoo'dan gelen kategori ID'si (`categ_id[0]`)
- Sağ taraf: Veritabanınızdaki kategori UUID'si

3. **Kategori UUID'lerini öğrenmek için:**

```sql
SELECT id, name, slug FROM categories;
```

veya Prisma Studio kullanın:
```bash
npx prisma studio
```

4. **Script'i çalıştır:**

```bash
npm run import-products
```

## 📊 Script Özellikleri

### ✅ Otomatik İşlemler

- **Slug oluşturma:** `gateway_slug` yoksa `name`'den otomatik slug oluşturur
- **Duplicate kontrolü:** Aynı slug veya barcode varsa atlar veya unique yapar
- **Image URLs:** Tüm image alanlarını (`image_1920`, `image_1024`, vb.) array'e çevirir
- **Description priority:** `webshop_description_long` > `webshop_description` > `website_description` > `description`
- **Date parsing:** `create_date` ve `write_date` alanlarını parse eder
- **Batch processing:** 50'şer ürün halinde toplu ekleme yapar

### 📈 Progress Tracking

Script çalışırken:
- İşlenen ürün sayısı
- Eklenecek ürün sayısı
- Atlanan ürün sayısı
- Hata sayısı

gösterilir.

### ⚠️ Atlanan Kayıtlar

Aşağıdaki durumlarda ürünler atlanır:
- `name` veya `list_price` eksik
- Geçersiz fiyat (negatif veya NaN)
- Boş slug
- Kategori bulunamadı
- Duplicate slug/barcode

## 🔍 Veri Eşleştirme

Detaylı eşleştirme tablosu için `VERI_ESLESTIRME.md` dosyasına bakın.

### Temel Eşleştirmeler

| Products Tablosu | barcodes.json |
|------------------|---------------|
| `name` | `name` |
| `slug` | `gateway_slug` (fallback: name'den) |
| `price` | `list_price` |
| `stock` | `qty_available` |
| `barcode` | `barcode` |
| `unit` | `uom_name` |
| `isActive` | `active` |
| `isFeatured` | `gateway_featured` |
| `showStock` | `show_availability` |
| `lowStockLevel` | `available_threshold` |
| `imageUrls` | `image_1920`, `image_1024`, `image_512`, `image_256`, `image_128` |
| `description` | `webshop_description_long` > `webshop_description` > `website_description` > `description` |

## 📝 Örnek Çıktı

```
🚀 Ürün import işlemi başlatılıyor...

📂 JSON dosyası okunuyor...
✅ 1000 ürün bulundu

ℹ️  Category mapping dosyası bulunamadı (backend/category-mapping.json)
   Default kategori kullanılacak. Mapping için category-mapping.json oluşturabilirsiniz.

📁 Default kategori oluşturuluyor...
   ✅ Default kategori oluşturuldu: Genel

🔍 Mevcut ürünler kontrol ediliyor...
   50 mevcut slug, 45 mevcut barkod bulundu

🔄 Veriler hazırlanıyor...
   İşleniyor: 1000/1000 (950 eklenecek, 50 atlandı)

✅ Veri hazırlama tamamlandı:
   📊 Toplam ürün: 1000
   ✅ Eklenecek: 950
   ⏭️  Atlanan: 50

💾 Veritabanına kaydediliyor...
   Kaydedilen: 950/950

✅ Import işlemi tamamlandı!
   ✅ Başarıyla eklendi: 950
   ⏭️  Atlandı: 50

📋 İlk 10 atlanan kayıt:
   1. ID: 12345, Name: Ürün Adı, Sebep: Eksik alanlar (name veya list_price)
   ...

📊 Özet İstatistikler:
   Toplam ürün sayısı: 1000
   Ortalama fiyat: 5.50 €
   Ortalama stok: 25

👋 Veritabanı bağlantısı kapatıldı.
```

## 🐛 Sorun Giderme

### "Kategori bulunamadı" hatası

- `category-mapping.json` dosyasını kontrol edin
- Kategori UUID'lerinin doğru olduğundan emin olun
- Default kategori oluşturulmuş mu kontrol edin

### "Duplicate slug" hatası

- Script otomatik olarak unique slug oluşturur (`slug-1`, `slug-2`, vb.)
- Eğer hala hata alıyorsanız, mevcut ürünleri kontrol edin

### "Geçersiz fiyat" hatası

- `list_price` alanının sayısal olduğundan emin olun
- Negatif fiyatlar kabul edilmez

## 📚 İlgili Dosyalar

- `backend/src/scripts/importProducts.js` - Ana script
- `backend/VERI_ESLESTIRME.md` - Detaylı veri eşleştirme rehberi
- `backend/category-mapping.example.json` - Mapping örnek dosyası
- `backend/frontend/barcodes.json` - Kaynak veri dosyası

