import dotenv from 'dotenv';
import prisma from '../config/prisma.js';

// .env dosyasını yükle
dotenv.config();

/**
 * OpenFoodFacts fotoğraflarını kaldır
 */
async function removeOpenFoodFactsImages() {
  try {
    console.log('🚀 OpenFoodFacts fotoğrafları kaldırma işlemi başlatılıyor...\n');

    // Tüm ürünleri çek (imageUrls'i olanlar)
    console.log('🔍 Fotoğrafı olan ürünler kontrol ediliyor...');
    const productsWithImages = await prisma.product.findMany({
      where: {
        imageUrls: {
          not: {
            equals: [],
          },
        },
      },
      select: {
        id: true,
        name: true,
        barcode: true,
        imageUrls: true,
      },
    });

    console.log(`✅ ${productsWithImages.length} ürün bulundu (fotoğrafı var)\n`);

    if (productsWithImages.length === 0) {
      console.log('⚠️  Güncellenecek ürün yok. İşlem sonlandırılıyor.');
      return;
    }

    let updated = 0;
    let skipped = 0;
    let errors = [];

    console.log('🗑️  OpenFoodFacts fotoğrafları kaldırılıyor...\n');

    for (let i = 0; i < productsWithImages.length; i++) {
      const product = productsWithImages[i];

      process.stdout.write(
        `\r   İşleniyor: ${i + 1}/${productsWithImages.length} | Güncellendi: ${updated} | Atlandı: ${skipped}`
      );

      try {
        const imageUrls = Array.isArray(product.imageUrls)
          ? product.imageUrls
          : [];

        if (imageUrls.length === 0) {
          skipped++;
          continue;
        }

        // OpenFoodFacts URL'lerini filtrele (images.openfoodfacts.org içeren)
        const openFoodFactsPattern = /images\.openfoodfacts\.org/i;
        const filteredUrls = imageUrls.filter(
          (url) => !openFoodFactsPattern.test(url)
        );

        // Eğer değişiklik varsa güncelle
        if (filteredUrls.length !== imageUrls.length) {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              imageUrls: filteredUrls,
            },
          });

          updated++;
        } else {
          skipped++;
        }
      } catch (error) {
        errors.push({
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          error: error.message,
        });
        skipped++;
      }
    }

    console.log('\n\n✅ Fotoğraf kaldırma işlemi tamamlandı!');
    console.log(`   ✅ Güncellendi: ${updated}`);
    console.log(`   ⏭️  Atlandı: ${skipped}`);

    if (errors.length > 0) {
      console.log(`   ❌ Hata sayısı: ${errors.length}`);
      console.log('\n📋 İlk 10 hata:');
      errors.slice(0, 10).forEach((err, index) => {
        console.log(
          `   ${index + 1}. ${err.name} (Barcode: ${err.barcode}): ${err.error}`
        );
      });
      if (errors.length > 10) {
        console.log(`   ... ve ${errors.length - 10} hata daha`);
      }
    }

    // Özet istatistikler
    console.log('\n📊 Özet İstatistikler:');
    const totalWithImages = await prisma.product.count({
      where: {
        imageUrls: {
          not: {
            equals: [],
          },
        },
      },
    });
    const totalProducts = await prisma.product.count();

    console.log(`   Toplam ürün: ${totalProducts}`);
    console.log(`   Fotoğrafı olan: ${totalWithImages}`);
    console.log(`   Fotoğrafı olmayan: ${totalProducts - totalWithImages}`);
    console.log(
      `   Fotoğraf oranı: ${((totalWithImages / totalProducts) * 100).toFixed(1)}%`
    );
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
removeOpenFoodFactsImages();

