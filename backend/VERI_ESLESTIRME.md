# Barcodes.json → Products Tablosu Veri Eşleştirme Rehberi

**Oluşturulma Tarihi:** 2025-01-17

Bu doküman, `barcodes.json` dosyasındaki alanların `products` tablosundaki kolonlara nasıl eşleştirileceğini açıklar.

---

## ✅ Mevcut Kolonlar ve Eşleştirmeler

### Zorunlu Alanlar (Required)

| Products Tablosu | barcodes.json Alanı | Dönüşüm Notları | Örnek Değer |
|------------------|---------------------|-----------------|-------------|
| `name` | `name` | Direkt eşleştirme, trim() uygulanmalı | `"Omega  Economy XXXl Pack blau  350g"` |
| `slug` | `gateway_slug` | Direkt eşleştirme, unique constraint var | `"omega-economy-xxxl-pack-blau-350g-37724"` |
| `price` | `list_price` | Decimal'e çevrilmeli, null kontrolü yapılmalı | `2.99` → `Decimal(2.99)` |
| `categoryId` | `categ_id[0]` | **⚠️ ÖNEMLİ:** Array'in ilk elemanı (ID), UUID'ye mapping yapılmalı | `[8, "19%"]` → `8` (Odoo ID) |
| `stock` | `qty_available` | Integer'e çevrilmeli, default: 0 | `0` → `0` |

### Opsiyonel Alanlar (Optional)

| Products Tablosu | barcodes.json Alanı | Dönüşüm Notları | Örnek Değer |
|------------------|---------------------|-----------------|-------------|
| `description` | `description` veya `website_description` veya `webshop_description` veya `webshop_description_long` | İlk dolu olanı seç, false/null ise null | `false` → `null` |
| `barcode` | `barcode` | String, trim() uygulanmalı | `"4260005391541"` |
| `unit` | `uom_name` | String, trim() uygulanmalı | `"Einheiten"` |
| `brand` | `manufacturer_id` | **⚠️ SORUNLU:** Bu bir ID (false/ID), isim değil. Mapping gerekli veya null bırakılmalı | `false` → `null` |
| `lowStockLevel` | `available_threshold` | Integer'e çevrilmeli, 0 ise null | `5` → `5`, `0` → `null` |
| `isActive` | `active` | Boolean, direkt eşleştirme | `true` → `true` |
| `isFeatured` | `gateway_featured` | Boolean, direkt eşleştirme | `false` → `false` |
| `showStock` | `show_availability` | Boolean, direkt eşleştirme | `false` → `false` |
| `imageUrls` | `image_1920`, `image_1024`, `image_512`, `image_256`, `image_128` | **Dönüşüm:** Tüm dolu image URL'lerini array'e çevir, false/null olanları atla | `["url1", "url2"]` veya `[]` |

### Otomatik Alanlar (Auto-generated)

| Products Tablosu | Kaynak | Not |
|------------------|--------|-----|
| `id` | Otomatik UUID | Prisma tarafından oluşturulur |
| `createdAt` | `create_date` | DateTime parse edilmeli, yoksa `now()` |
| `updatedAt` | `write_date` | DateTime parse edilmeli, yoksa `now()` |

---

## ⚠️ Özel Durumlar ve Dönüşümler

### 1. Category Mapping (Kritik!)
```javascript
// categ_id: [8, "19%"] → categoryId (UUID)
// Odoo kategori ID'si (8) → Bizim UUID kategori ID'sine mapping yapılmalı
// Bu mapping için bir lookup tablosu veya mapping dosyası gerekli!
```

**Çözüm Önerileri:**
- Odoo kategori ID'lerini bizim kategori UUID'lerine mapping yapan bir tablo/JSON dosyası oluştur
- Veya kategori adına göre eşleştirme yap (categ_id[1] kullanarak)

### 2. Image URLs Array
```javascript
// Tüm image alanlarını kontrol et ve dolu olanları array'e ekle
const imageUrls = [];
if (product.image_1920 && product.image_1920 !== false) imageUrls.push(product.image_1920);
if (product.image_1024 && product.image_1024 !== false) imageUrls.push(product.image_1024);
if (product.image_512 && product.image_512 !== false) imageUrls.push(product.image_512);
if (product.image_256 && product.image_256 !== false) imageUrls.push(product.image_256);
if (product.image_128 && product.image_128 !== false) imageUrls.push(product.image_128);
```

### 3. Description Priority
```javascript
// Öncelik sırası: webshop_description_long > webshop_description > website_description > description
const description = 
  product.webshop_description_long || 
  product.webshop_description || 
  product.website_description || 
  product.description || 
  null;
```

### 4. Slug Fallback
```javascript
// gateway_slug yoksa name'den slug oluştur
const slug = product.gateway_slug || 
  product.name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
```

---

## 📋 Eksik Olan Ama Önerilen Kolonlar

Aşağıdaki kolonlar `barcodes.json`'da mevcut ama `products` tablosunda yok. İş mantığı açısından faydalı olabilirler:

### 1. **SKU / Product Code** (Önerilen: Yüksek Öncelik)
- **barcodes.json:** `default_code` → `"P0024035"`
- **Öneri:** `sku` kolonu eklenmeli (String, unique, nullable)
- **Neden:** Ürün takibi ve stok yönetimi için kritik
- **Not:** Şu anda `ProductVariant` modelinde `sku` var ama `Product` modelinde yok

### 2. **Cost Price / Standard Price** (Önerilen: Orta Öncelik)
- **barcodes.json:** `standard_price` → `0.89`
- **Öneri:** `costPrice` kolonu eklenmeli (Decimal, nullable)
- **Neden:** Kar marjı hesaplamaları ve maliyet analizi için gerekli
- **Kullanım:** `price - costPrice = profit`

### 3. **Weight** (Önerilen: Düşük Öncelik)
- **barcodes.json:** `weight` → `0`
- **Öneri:** `weight` kolonu eklenmeli (Decimal, nullable)
- **Neden:** Kargo hesaplamaları için kullanılabilir

### 4. **Volume** (Önerilen: Düşük Öncelik)
- **barcodes.json:** `volume` → `0`
- **Öneri:** `volume` kolonu eklenmeli (Decimal, nullable)
- **Neden:** Depolama ve lojistik hesaplamaları için

### 5. **External ID / Odoo ID** (Önerilen: Orta Öncelik)
- **barcodes.json:** `id` → `37724`
- **Öneri:** `externalId` kolonu eklenmeli (String, nullable, indexed)
- **Neden:** Odoo ile senkronizasyon için referans ID
- **Kullanım:** Güncellemelerde bu ID ile eşleştirme yapılabilir

### 6. **Manufacturer Name** (Önerilen: Orta Öncelik)
- **barcodes.json:** `manufacturer_id` → ID (false veya number)
- **Öneri:** `manufacturerName` kolonu eklenmeli (String, nullable)
- **Neden:** `manufacturer_id` bir ID, isim değil. Mapping gerekli veya direkt isim alanı eklenmeli
- **Alternatif:** Manufacturer tablosu oluşturulabilir

### 7. **Tax Rate** (Önerilen: Düşük Öncelik)
- **barcodes.json:** `taxes_id`, `single_tax_id` → `[118, "19% Umsatzsteuer"]`
- **Öneri:** `taxRate` kolonu eklenmeli (Decimal, nullable) veya `taxId` (String, nullable)
- **Neden:** Fiyat hesaplamalarında vergi oranı gerekebilir

### 8. **SEO Fields** (Önerilen: Düşük Öncelik)
- **barcodes.json:** `website_meta_title`, `website_meta_description`, `seo_name`
- **Öneri:** `metaTitle`, `metaDescription`, `seoSlug` kolonları eklenebilir
- **Neden:** SEO optimizasyonu için

---

## 🔄 Örnek Dönüşüm Kodu

```javascript
function mapBarcodeToProduct(barcodeItem, categoryMapping) {
  // Image URLs array oluştur
  const imageUrls = [];
  const imageFields = ['image_1920', 'image_1024', 'image_512', 'image_256', 'image_128'];
  imageFields.forEach(field => {
    if (barcodeItem[field] && barcodeItem[field] !== false) {
      imageUrls.push(String(barcodeItem[field]));
    }
  });

  // Description priority
  const description = 
    barcodeItem.webshop_description_long || 
    barcodeItem.webshop_description || 
    barcodeItem.website_description || 
    barcodeItem.description || 
    null;

  // Slug fallback
  const slug = barcodeItem.gateway_slug || 
    barcodeItem.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  // Category mapping (Odoo ID → UUID)
  const odooCategoryId = Array.isArray(barcodeItem.categ_id) ? barcodeItem.categ_id[0] : null;
  const categoryId = categoryMapping[odooCategoryId] || null; // Mapping tablosundan al

  // Date parsing
  const createdAt = barcodeItem.create_date ? 
    new Date(barcodeItem.create_date) : 
    new Date();
  const updatedAt = barcodeItem.write_date ? 
    new Date(barcodeItem.write_date) : 
    new Date();

  return {
    name: String(barcodeItem.name).trim(),
    slug: slug,
    description: description ? String(description).trim() : null,
    price: parseFloat(barcodeItem.list_price) || 0,
    stock: parseInt(barcodeItem.qty_available) || 0,
    lowStockLevel: barcodeItem.available_threshold && barcodeItem.available_threshold > 0 ? 
      parseInt(barcodeItem.available_threshold) : null,
    unit: barcodeItem.uom_name ? String(barcodeItem.uom_name).trim() : null,
    barcode: barcodeItem.barcode ? String(barcodeItem.barcode).trim() : null,
    brand: null, // manufacturer_id bir ID, mapping gerekli veya null bırak
    imageUrls: imageUrls,
    isActive: barcodeItem.active === true,
    isFeatured: barcodeItem.gateway_featured === true,
    showStock: barcodeItem.show_availability === true,
    categoryId: categoryId, // UUID, mapping gerekli!
    createdAt: createdAt,
    updatedAt: updatedAt,
  };
}
```

---

## 📊 Özet Tablo

| Durum | Kolon Sayısı | Açıklama |
|-------|--------------|----------|
| ✅ Direkt Eşleşen | 9 | name, slug, price, stock, barcode, unit, isActive, isFeatured, showStock |
| ⚠️ Dönüşüm Gereken | 4 | categoryId (mapping), imageUrls (array), description (priority), lowStockLevel |
| ❌ Eksik (Önerilen) | 8 | sku, costPrice, weight, volume, externalId, manufacturerName, taxRate, seoFields |

---

## 🚨 Kritik Notlar

1. **Category Mapping:** En kritik konu! Odoo kategori ID'lerini bizim UUID'lere mapping yapan bir sistem gerekli.
2. **Slug Uniqueness:** `gateway_slug` unique constraint var, duplicate kontrolü yapılmalı.
3. **Price Validation:** `list_price` null veya negatif olamaz, kontrol edilmeli.
4. **Barcode Uniqueness:** Aynı barcode birden fazla üründe olabilir mi? Kontrol edilmeli.
5. **Active Products:** Sadece `active: true` olanlar mı import edilmeli? Karar verilmeli.

---

## 📝 Sonraki Adımlar

1. ✅ Category mapping tablosu/dosyası oluştur
2. ✅ Import script'i yaz (mevcut `importBarcodeLabels.js` benzeri)
3. ✅ Validation ve error handling ekle
4. ✅ Batch processing için optimize et
5. ⚠️ Eksik kolonlar için migration hazırla (opsiyonel)

