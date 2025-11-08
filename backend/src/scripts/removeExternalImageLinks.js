import dotenv from 'dotenv';
import prisma from '../config/prisma.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// .env dosyasını yükle
dotenv.config();

// ES modules için __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log dosyası
const logDir = path.join(__dirname, '../../tracking');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, 'remove-external-images-log.json');

/**
 * URL'nin harici link olup olmadığını kontrol et
 * @param {string} url - Kontrol edilecek URL
 * @returns {boolean} Harici link ise true
 */
function isExternalUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Boş string kontrolü
  if (url.trim().length === 0) {
    return false;
  }

  // Yerel dosya yolu kontrolü (/uploads/products/ ile başlıyorsa yerel)
  if (url.startsWith('/uploads/products/')) {
    return false;
  }

  // Harici URL kontrolü (http:// veya https:// ile başlıyorsa harici)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return true;
  }

  // Diğer durumlar yerel kabul edilir
  return false;
}

/**
 * Harici linkleri kaldır ve sadece yerel fotoğrafları bırak
 */
async function removeExternalImageLinks() {
  try {
    console.log('🔍 Harici link olan fotoğraflar kontrol ediliyor...\n');

    // Tüm ürünleri çek
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        barcode: true,
        imageUrls: true,
      },
    });

    console.log(`📦 Toplam ürün sayısı: ${allProducts.length}\n`);

    const processedProducts = [];
    let totalRemoved = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const errors = [];

    // Her ürünü kontrol et ve güncelle
    for (const product of allProducts) {
      try {
        // imageUrls boş veya null ise atla
        if (!product.imageUrls || !Array.isArray(product.imageUrls)) {
          totalSkipped++;
          continue;
        }

        // Harici ve yerel linkleri ayır
        const externalUrls = product.imageUrls.filter((url) => isExternalUrl(url));
        const localUrls = product.imageUrls.filter((url) => !isExternalUrl(url));

        // Eğer harici link yoksa atla
        if (externalUrls.length === 0) {
          totalSkipped++;
          continue;
        }

        // Harici linkleri kaldır, sadece yerel linkleri bırak
        const updatedImageUrls = localUrls;

        // Veritabanını güncelle
        await prisma.product.update({
          where: { id: product.id },
          data: {
            imageUrls: updatedImageUrls,
          },
        });

        // İşlem kaydı
        processedProducts.push({
          productId: product.id,
          name: product.name,
          slug: product.slug,
          barcode: product.barcode,
          removedExternalUrls: externalUrls,
          keptLocalUrls: localUrls,
          removedCount: externalUrls.length,
          keptCount: localUrls.length,
          timestamp: new Date().toISOString(),
        });

        totalRemoved += externalUrls.length;
        totalUpdated++;

        // İlerleme göster (her 10 üründe bir)
        if (totalUpdated % 10 === 0) {
          console.log(`   ✅ ${totalUpdated} ürün güncellendi...`);
        }
      } catch (error) {
        errors.push({
          productId: product.id,
          name: product.name,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        console.error(`   ❌ Hata: ${product.name} (${product.id}): ${error.message}`);
      }
    }

    // Sonuçları konsola yazdır
    console.log('\n📊 Sonuçlar:\n');
    console.log(`   ✅ Güncellenen ürün sayısı: ${totalUpdated}`);
    console.log(`   🗑️  Kaldırılan harici link sayısı: ${totalRemoved}`);
    console.log(`   ⏭️  Atlanan ürün sayısı: ${totalSkipped}`);
    console.log(`   ❌ Hata sayısı: ${errors.length}`);

    // İlk 10 güncellenen ürünü göster
    if (processedProducts.length > 0) {
      console.log('\n📋 İlk 10 güncellenen ürün:\n');
      processedProducts.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name}`);
        console.log(`   ID: ${item.productId}`);
        console.log(`   Barcode: ${item.barcode || 'N/A'}`);
        console.log(`   Kaldırılan harici link: ${item.removedCount} adet`);
        console.log(`   Korunan yerel fotoğraf: ${item.keptCount} adet`);
        if (item.removedExternalUrls.length > 0) {
          console.log(`   Kaldırılan linkler:`);
          item.removedExternalUrls.forEach((url) => {
            console.log(`     - ${url.substring(0, 80)}...`);
          });
        }
        console.log('');
      });

      if (processedProducts.length > 10) {
        console.log(`   ... ve ${processedProducts.length - 10} ürün daha güncellendi\n`);
      }
    }

    // Log dosyasına kaydet
    const logData = {
      executedAt: new Date().toISOString(),
      summary: {
        totalProducts: allProducts.length,
        updatedProducts: totalUpdated,
        removedExternalLinks: totalRemoved,
        skippedProducts: totalSkipped,
        errors: errors.length,
      },
      processedProducts: processedProducts,
      errors: errors,
    };

    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2), 'utf8');
    console.log(`\n✅ İşlem logları kaydedildi: ${logFile}`);

    // Hata varsa göster
    if (errors.length > 0) {
      console.log('\n❌ Hatalar:\n');
      errors.slice(0, 10).forEach((err, index) => {
        console.log(`${index + 1}. ${err.name} (${err.productId}): ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`   ... ve ${errors.length - 10} hata daha`);
      }
    }

    // Özet istatistikler
    console.log('\n📊 Özet İstatistikler:');
    console.log(`   Toplam ürün: ${allProducts.length}`);
    console.log(`   Güncellenen ürün: ${totalUpdated}`);
    console.log(`   Kaldırılan harici link: ${totalRemoved}`);
    console.log(`   Atlanan ürün: ${totalSkipped}`);
    console.log(`   Hata: ${errors.length}`);
    console.log(`   Başarı oranı: ${((totalUpdated / (totalUpdated + errors.length)) * 100).toFixed(2)}%`);

    console.log('\n✅ Harici link temizleme işlemi tamamlandı!');
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
removeExternalImageLinks();

