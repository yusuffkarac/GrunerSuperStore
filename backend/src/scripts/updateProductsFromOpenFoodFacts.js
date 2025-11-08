import dotenv from 'dotenv';
import prisma from '../config/prisma.js';
import openFoodFactsService from '../services/openfoodfacts.service.js';
import {
  mapOpenFoodFactsToProduct,
  mergeOpenFoodFactsData,
} from '../utils/openfoodfactsMapper.js';

// .env dosyasını yükle
dotenv.config();

/**
 * Mevcut ürünleri OpenFoodFacts API'sinden gelen verilerle güncelle
 */
async function updateProductsFromOpenFoodFacts() {
  try {
    // Komut satırı argümanlarını kontrol et
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const barcodeOnly = args.includes('--barcode-only');

    console.log('🚀 OpenFoodFacts ürün güncelleme işlemi başlatılıyor...\n');

    if (isDryRun) {
      console.log('⚠️  DRY-RUN MODU: Veritabanına yazılmayacak\n');
    }

    // Barkodu olan ürünleri getir
    console.log('🔍 Barkodu olan ürünler sorgulanıyor...');
    const products = await prisma.product.findMany({
      where: {
        barcode: {
          not: null,
        },
        ...(barcodeOnly && {
          barcode: {
            not: '',
          },
        }),
      },
      select: {
        id: true,
        name: true,
        barcode: true,
        ingredientsText: true,
        allergens: true,
        nutriscoreGrade: true,
        ecoscoreGrade: true,
        nutritionData: true,
        openfoodfactsCategories: true,
      },
    });

    console.log(`✅ ${products.length} ürün bulundu\n`);

    if (products.length === 0) {
      console.log('⚠️  Güncellenecek ürün bulunamadı.');
      return;
    }

    // İstatistikler
    let updated = 0;
    let skipped = 0;
    let errors = [];
    const batchSize = 100; // Batch size artırıldı
    const concurrentRequests = 10; // Paralel istek sayısı
    const delayBetweenBatches = 100; // Batch arası kısa delay

    console.log('🔄 Ürünler güncelleniyor...\n');

    // Tek bir ürünü işle
    async function processProduct(product) {
      try {
        // OpenFoodFacts'ten veri çek
        const offProduct = await openFoodFactsService.fetchProductByBarcode(
          product.barcode
        );

        if (!offProduct) {
          return { success: false, reason: 'Ürün bulunamadı' };
        }

        // Veriyi Product modeline dönüştür
        const mappedData = mapOpenFoodFactsToProduct(offProduct);

        if (!mappedData || Object.keys(mappedData).length === 0) {
          return { success: false, reason: 'Veri dönüştürülemedi' };
        }

        // Mevcut veriyle birleştir (sadece boş alanları güncelle)
        const updateData = mergeOpenFoodFactsData(product, mappedData);

        if (Object.keys(updateData).length === 0) {
          return { success: false, reason: 'Güncellenecek veri yok' };
        }

        // Dry-run modunda sadece logla
        if (isDryRun) {
          return {
            success: true,
            product,
            updateData,
            fields: Object.keys(updateData),
          };
        } else {
          // Veritabanını güncelle
          await prisma.product.update({
            where: { id: product.id },
            data: updateData,
          });
          return {
            success: true,
            product,
            updateData,
            fields: Object.keys(updateData),
          };
        }
      } catch (error) {
        return {
          success: false,
          product,
          error: error.message,
        };
      }
    }

    // Paralel işleme için chunk'ları işle
    async function processChunk(chunk, chunkIndex, totalChunks) {
      const results = [];
      
      // Chunk'ı daha küçük paralel gruplara böl
      for (let i = 0; i < chunk.length; i += concurrentRequests) {
        const parallelGroup = chunk.slice(i, i + concurrentRequests);
        const groupResults = await Promise.all(
          parallelGroup.map((product) => processProduct(product))
        );
        results.push(...groupResults);
      }
      
      return results;
    }

    // Batch processing - paralel işleme ile
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(products.length / batchSize);

      console.log(
        `📦 Batch ${batchNumber}/${totalBatches} işleniyor (${batch.length} ürün)...`
      );

      const startTime = Date.now();
      const results = await processChunk(batch, batchNumber, totalBatches);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      // Sonuçları işle
      for (const result of results) {
        if (result.success) {
          if (isDryRun) {
            console.log(
              `  ✅ [DRY-RUN] ${result.product.name} (${result.product.barcode}) güncellenecek:`,
              result.fields.join(', ')
            );
          }
          updated++;
        } else {
          if (result.error) {
            errors.push({
              productId: result.product?.id,
              name: result.product?.name,
              barcode: result.product?.barcode,
              error: result.error,
            });
            console.error(
              `  ❌ Hata (${result.product?.name} - ${result.product?.barcode}):`,
              result.error
            );
          } else {
            skipped++;
          }
        }
      }

      // Batch arası progress göster
      process.stdout.write(
        `\r   İşleniyor: ${Math.min(i + batchSize, products.length)}/${products.length} | Güncellenen: ${updated} | Atlanan: ${skipped} | Hatalar: ${errors.length} | Süre: ${duration}s`
      );
      console.log('\n');

      // Batch arası kısa delay (rate limiting için)
      if (i + batchSize < products.length) {
        await openFoodFactsService.delay(delayBetweenBatches);
      }
    }

    // Özet
    console.log('\n✅ Güncelleme işlemi tamamlandı!');
    console.log(`   ✅ Güncellenen: ${updated}`);
    console.log(`   ⏭️  Atlanan: ${skipped}`);
    console.log(`   ❌ Hatalar: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n📋 İlk 20 hata:');
      errors.slice(0, 20).forEach((err, index) => {
        console.log(
          `   ${index + 1}. ${err.name} (${err.barcode}): ${err.error}`
        );
      });
      if (errors.length > 20) {
        console.log(`   ... ve ${errors.length - 20} hata daha`);
      }
    }

    if (isDryRun) {
      console.log(
        '\n⚠️  DRY-RUN modunda çalıştırıldı. Veritabanına yazılmadı.'
      );
      console.log('   Gerçek güncelleme için --dry-run parametresini kaldırın.');
    }
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
updateProductsFromOpenFoodFacts();

