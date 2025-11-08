import dotenv from 'dotenv';
import prisma from '../config/prisma.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// .env dosyasını yükle
dotenv.config();

// ES modules için __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Slug oluştur (name'den)
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Tarih parse et
 */
function parseDate(dateString) {
  if (!dateString || dateString === false) {
    return new Date();
  }
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * barcodes.json verisini Product modeline dönüştür
 */
function mapBarcodeToProduct(barcodeItem, categoryMapping, defaultCategoryId) {
  // Image URLs array oluştur
  const imageUrls = [];
  const imageFields = ['image_1920', 'image_1024', 'image_512', 'image_256', 'image_128'];
  imageFields.forEach((field) => {
    if (barcodeItem[field] && barcodeItem[field] !== false) {
      imageUrls.push(String(barcodeItem[field]));
    }
  });

  // Description priority: webshop_description_long > webshop_description > website_description > description
  const description =
    barcodeItem.webshop_description_long ||
    barcodeItem.webshop_description ||
    barcodeItem.website_description ||
    barcodeItem.description ||
    null;

  // Slug fallback: gateway_slug yoksa name'den oluştur
  const slug =
    barcodeItem.gateway_slug && barcodeItem.gateway_slug !== false
      ? String(barcodeItem.gateway_slug).trim()
      : generateSlug(barcodeItem.name);

  // Category mapping: Odoo ID → UUID
  const odooCategoryId = Array.isArray(barcodeItem.categ_id)
    ? barcodeItem.categ_id[0]
    : null;
  const categoryId =
    (odooCategoryId && categoryMapping[odooCategoryId]) || defaultCategoryId;

  // Date parsing
  const createdAt = parseDate(barcodeItem.create_date);
  const updatedAt = parseDate(barcodeItem.write_date);

  return {
    name: String(barcodeItem.name).trim(),
    slug: slug,
    description: description ? String(description).trim() : null,
    price: parseFloat(barcodeItem.list_price) || 0,
    stock: parseInt(barcodeItem.qty_available) || 0,
    lowStockLevel:
      barcodeItem.available_threshold &&
      barcodeItem.available_threshold > 0
        ? parseInt(barcodeItem.available_threshold)
        : null,
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

/**
 * Category mapping dosyasını yükle (opsiyonel)
 */
function loadCategoryMapping() {
  const mappingPath = path.join(__dirname, '../../category-mapping.json');
  if (fs.existsSync(mappingPath)) {
    try {
      const mappingData = JSON.parse(
        fs.readFileSync(mappingPath, 'utf8')
      );
      console.log(
        `✅ Category mapping yüklendi: ${Object.keys(mappingData).length} kategori`
      );
      return mappingData;
    } catch (error) {
      console.warn(
        `⚠️  Category mapping dosyası okunamadı: ${error.message}`
      );
    }
  } else {
    console.log(
      `ℹ️  Category mapping dosyası bulunamadı (${mappingPath})`
    );
    console.log(
      `   Default kategori kullanılacak. Mapping için category-mapping.json oluşturabilirsiniz.`
    );
  }
  return {};
}

/**
 * Default kategoriyi bul veya oluştur
 */
async function getOrCreateDefaultCategory() {
  // Önce "Genel" veya "Diğer" kategorisini ara
  let defaultCategory = await prisma.category.findFirst({
    where: {
      OR: [
        { slug: 'genel' },
        { slug: 'diger' },
        { slug: 'allgemein' },
        { slug: 'other' },
      ],
    },
  });

  if (!defaultCategory) {
    // Yoksa oluştur
    console.log('📁 Default kategori oluşturuluyor...');
    defaultCategory = await prisma.category.create({
      data: {
        name: 'Genel',
        slug: 'genel',
        isActive: true,
      },
    });
    console.log(`   ✅ Default kategori oluşturuldu: ${defaultCategory.name}`);
  } else {
    console.log(
      `✅ Default kategori bulundu: ${defaultCategory.name} (${defaultCategory.id})`
    );
  }

  return defaultCategory.id;
}

async function importProducts() {
  try {
    console.log('🚀 Ürün import işlemi başlatılıyor...\n');

    // JSON dosyasını oku
    const jsonPath = path.join(__dirname, '../../frontend/barcodes.json');

    if (!fs.existsSync(jsonPath)) {
      console.error('❌ Hata: barcodes.json dosyası bulunamadı!');
      console.error(`   Beklenen yol: ${jsonPath}`);
      process.exit(1);
    }

    console.log('📂 JSON dosyası okunuyor...');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    if (!Array.isArray(jsonData)) {
      console.error('❌ Hata: JSON dosyası bir array olmalı!');
      process.exit(1);
    }

    console.log(`✅ ${jsonData.length} ürün bulundu\n`);

    // Category mapping yükle
    const categoryMapping = loadCategoryMapping();
    console.log('');

    // Default kategoriyi al
    const defaultCategoryId = await getOrCreateDefaultCategory();
    console.log('');

    // Tüm kategorileri cache'le (performans için)
    console.log('🔍 Kategoriler yükleniyor...');
    const allCategories = await prisma.category.findMany({
      select: { id: true },
    });
    const categoryIdsSet = new Set(allCategories.map((c) => c.id));
    console.log(`   ${categoryIdsSet.size} kategori bulundu\n`);

    // Mevcut slug'ları kontrol et (duplicate kontrolü için)
    console.log('🔍 Mevcut ürünler kontrol ediliyor...');
    const existingProducts = await prisma.product.findMany({
      select: { slug: true, barcode: true },
    });
    const existingSlugs = new Set(
      existingProducts.map((p) => p.slug).filter(Boolean)
    );
    const existingBarcodes = new Set(
      existingProducts.map((p) => p.barcode).filter(Boolean)
    );
    console.log(
      `   ${existingSlugs.size} mevcut slug, ${existingBarcodes.size} mevcut barkod bulundu\n`
    );

    // Verileri hazırla ve filtrele
    console.log('🔄 Veriler hazırlanıyor...');
    const productsToInsert = [];
    const skipped = [];
    let processed = 0;
    const slugCounter = {}; // Duplicate slug'lar için sayaç

    for (const product of jsonData) {
      processed++;

      // Gerekli alanları kontrol et
      if (
        !product.name ||
        product.list_price === undefined ||
        product.list_price === null
      ) {
        skipped.push({
          id: product.id,
          reason: 'Eksik alanlar (name veya list_price)',
        });
        continue;
      }

      // Fiyat kontrolü
      const price = parseFloat(product.list_price);
      if (isNaN(price) || price < 0) {
        skipped.push({
          id: product.id,
          name: product.name,
          reason: `Geçersiz fiyat: ${product.list_price}`,
        });
        continue;
      }

      // Ürün verisini hazırla
      const productData = mapBarcodeToProduct(
        product,
        categoryMapping,
        defaultCategoryId
      );

      // Slug uniqueness kontrolü ve düzeltme
      let finalSlug = productData.slug;
      
      // Mevcut slug'larda veya aynı batch'te duplicate varsa unique yap
      while (existingSlugs.has(finalSlug) || slugCounter[finalSlug]) {
        const baseSlug = productData.slug;
        const counter = (slugCounter[baseSlug] || 0) + 1;
        slugCounter[baseSlug] = counter;
        finalSlug = `${baseSlug}-${counter}`;
      }
      
      // Bu slug'ı kullanıldı olarak işaretle (aynı batch içinde duplicate kontrolü için)
      slugCounter[finalSlug] = 1;
      productData.slug = finalSlug;

      // Slug boş mu kontrol et
      if (!productData.slug || productData.slug.length === 0) {
        skipped.push({
          id: product.id,
          name: product.name,
          reason: 'Geçersiz slug',
        });
        continue;
      }

      // Name boş mu kontrol et
      if (!productData.name || productData.name.trim().length === 0) {
        skipped.push({
          id: product.id,
          reason: 'Boş name',
        });
        continue;
      }

      // Category ID kontrolü
      if (!productData.categoryId) {
        skipped.push({
          id: product.id,
          name: product.name,
          reason: 'Kategori bulunamadı',
        });
        continue;
      }

      productsToInsert.push(productData);
      existingSlugs.add(finalSlug); // Aynı batch içinde duplicate kontrolü için

      // Progress göster
      if (processed % 100 === 0) {
        process.stdout.write(
          `\r   İşleniyor: ${processed}/${jsonData.length} (${productsToInsert.length} eklenecek, ${skipped.length} atlandı)`
        );
      }
    }

    console.log(`\n\n✅ Veri hazırlama tamamlandı:`);
    console.log(`   📊 Toplam ürün: ${jsonData.length}`);
    console.log(`   ✅ Eklenecek: ${productsToInsert.length}`);
    console.log(`   ⏭️  Atlanan: ${skipped.length}`);
    
    // Atlanan kayıtların sebeplerini göster
    if (skipped.length > 0) {
      const skippedReasons = {};
      skipped.forEach((item) => {
        const reason = item.reason || 'Bilinmeyen';
        skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
      });
      console.log(`\n   📋 Atlama sebepleri:`);
      Object.entries(skippedReasons)
        .sort((a, b) => b[1] - a[1])
        .forEach(([reason, count]) => {
          console.log(`      - ${reason}: ${count} kayıt`);
        });
    }
    
    console.log('');

    if (productsToInsert.length === 0) {
      console.log('⚠️  Eklenecek kayıt yok. İşlem sonlandırılıyor.');
      return;
    }

    // Toplu ekleme (batch processing)
    console.log('💾 Veritabanına kaydediliyor...');
    const batchSize = 50; // Product daha karmaşık olduğu için batch size küçük
    let inserted = 0;
    let errors = [];
    let duplicateCount = 0;
    let categoryErrorCount = 0;
    let otherErrorCount = 0;

    for (let i = 0; i < productsToInsert.length; i += batchSize) {
      const batch = productsToInsert.slice(i, i + batchSize);

      try {
        // Her bir ürünü ayrı ayrı ekle (category relation için)
        for (const productData of batch) {
          try {
            const { categoryId, ...restData } = productData;
            
            // Category'nin var olduğunu kontrol et (cache'den)
            if (!categoryIdsSet.has(categoryId)) {
              categoryErrorCount++;
              skipped.push({
                name: productData.name,
                slug: productData.slug,
                reason: `Kategori bulunamadı: ${categoryId}`,
              });
              continue;
            }

            await prisma.product.create({
              data: {
                ...restData,
                category: {
                  connect: { id: categoryId },
                },
              },
            });
            inserted++;
          } catch (error) {
            // Unique constraint hatası (slug/barcode duplicate)
            if (
              error.code === 'P2002' ||
              error.message.includes('Unique constraint') ||
              error.message.includes('unique')
            ) {
              duplicateCount++;
              skipped.push({
                name: productData.name,
                slug: productData.slug,
                reason: `Duplicate: ${error.meta?.target?.join(', ') || 'slug/barcode'}`,
              });
            } else if (error.code === 'P2025' || error.message.includes('Record to connect')) {
              categoryErrorCount++;
              skipped.push({
                name: productData.name,
                slug: productData.slug,
                reason: `Kategori bağlantı hatası: ${error.message}`,
              });
            } else {
              otherErrorCount++;
              errors.push({
                name: productData.name,
                slug: productData.slug,
                error: error.message,
                code: error.code,
              });
            }
          }
        }

        process.stdout.write(
          `\r   Kaydedilen: ${inserted}/${productsToInsert.length} | Duplicate: ${duplicateCount} | Kategori Hatası: ${categoryErrorCount} | Diğer: ${otherErrorCount}`
        );
      } catch (error) {
        console.error(
          `\n❌ Batch hatası (${i}-${i + batch.length}):`,
          error.message
        );
        errors.push({
          batch: `${i}-${i + batch.length}`,
          error: error.message,
        });
      }
    }

    console.log('\n\n✅ Import işlemi tamamlandı!');
    console.log(`   ✅ Başarıyla eklendi: ${inserted}`);
    console.log(`   ⏭️  Atlandı: ${skipped.length}`);
    console.log(`   🔄 Duplicate: ${duplicateCount}`);
    console.log(`   📁 Kategori hatası: ${categoryErrorCount}`);
    console.log(`   ❌ Diğer hatalar: ${otherErrorCount}`);

    if (errors.length > 0) {
      console.log(`\n❌ Detaylı hata sayısı: ${errors.length}`);
      console.log('\n📋 İlk 20 hata:');
      errors.slice(0, 20).forEach((err, index) => {
        console.log(
          `   ${index + 1}. ${err.name || err.batch} (${err.slug || 'N/A'}): ${err.error} [Code: ${err.code || 'N/A'}]`
        );
      });
      if (errors.length > 20) {
        console.log(`   ... ve ${errors.length - 20} hata daha`);
      }
    }

    // Atlanan kayıtları göster (sebep bazında grupla)
    if (skipped.length > 0) {
      console.log('\n📋 Atlanan kayıtlar (sebep bazında):');
      const skippedByReason = {};
      skipped.forEach((item) => {
        const reason = item.reason || 'Bilinmeyen';
        if (!skippedByReason[reason]) {
          skippedByReason[reason] = [];
        }
        skippedByReason[reason].push(item);
      });

      Object.entries(skippedByReason)
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([reason, items]) => {
          console.log(`\n   ${reason}: ${items.length} kayıt`);
          items.slice(0, 5).forEach((item, index) => {
            console.log(
              `      ${index + 1}. ID: ${item.id || 'N/A'}, Name: ${item.name || 'N/A'}, Slug: ${item.slug || 'N/A'}`
            );
          });
          if (items.length > 5) {
            console.log(`      ... ve ${items.length - 5} kayıt daha`);
          }
        });
    }

    // Özet istatistikler
    console.log('\n📊 Özet İstatistikler:');
    const stats = await prisma.product.aggregate({
      _count: { id: true },
      _avg: { price: true, stock: true },
    });
    console.log(`   Toplam ürün sayısı: ${stats._count.id}`);
    console.log(`   Ortalama fiyat: ${stats._avg.price?.toFixed(2) || 0} €`);
    console.log(`   Ortalama stok: ${stats._avg.stock?.toFixed(0) || 0}`);
  } catch (error) {
    console.error('\n❌ Kritik hata:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n👋 Veritabanı bağlantısı kapatıldı.');
  }
}

// Scripti çalıştır
importProducts();

