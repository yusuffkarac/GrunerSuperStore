import dotenv from 'dotenv';
import prisma from '../config/prisma.js';

// .env dosyasını yükle
dotenv.config();

/**
 * "Genel" kategorisindeki tüm ürünleri "Allgemein" kategorisine taşı
 */
async function updateGenelToAllgemein() {
  try {
    console.log('🔄 Kategori güncelleme işlemi başlatılıyor...\n');

    // "Genel" kategorisini bul
    const genelCategory = await prisma.category.findFirst({
      where: {
        OR: [
          { name: 'Genel' },
          { slug: 'genel' },
        ],
      },
    });

    if (!genelCategory) {
      console.log('❌ "Genel" kategorisi bulunamadı.');
      return;
    }

    console.log(`✅ "Genel" kategorisi bulundu: ${genelCategory.name} (ID: ${genelCategory.id})`);

    // "Allgemein" kategorisini bul veya oluştur
    let allgemeinCategory = await prisma.category.findFirst({
      where: {
        OR: [
          { name: 'Allgemein' },
          { slug: 'allgemein' },
        ],
      },
    });

    if (!allgemeinCategory) {
      console.log('📝 "Allgemein" kategorisi bulunamadı, oluşturuluyor...');
      allgemeinCategory = await prisma.category.create({
        data: {
          name: 'Allgemein',
          slug: 'allgemein',
          isActive: true,
        },
      });
      console.log(`✅ "Allgemein" kategorisi oluşturuldu: ${allgemeinCategory.name} (ID: ${allgemeinCategory.id})`);
    } else {
      console.log(`✅ "Allgemein" kategorisi bulundu: ${allgemeinCategory.name} (ID: ${allgemeinCategory.id})`);
    }

    // "Genel" kategorisindeki ürün sayısını kontrol et
    const productCount = await prisma.product.count({
      where: {
        categoryId: genelCategory.id,
      },
    });

    console.log(`\n📊 "Genel" kategorisinde ${productCount} ürün bulundu.`);

    if (productCount === 0) {
      console.log('ℹ️  Güncellenecek ürün yok.');
      return;
    }

    // Ürünleri güncelle
    console.log('\n🔄 Ürünler güncelleniyor...');
    const result = await prisma.product.updateMany({
      where: {
        categoryId: genelCategory.id,
      },
      data: {
        categoryId: allgemeinCategory.id,
      },
    });

    console.log(`\n✅ ${result.count} ürün başarıyla "Allgemein" kategorisine taşındı.`);

    // Doğrulama: "Genel" kategorisinde kalan ürün sayısı
    const remainingCount = await prisma.product.count({
      where: {
        categoryId: genelCategory.id,
      },
    });

    console.log(`\n📊 "Genel" kategorisinde kalan ürün sayısı: ${remainingCount}`);

    // "Allgemein" kategorisindeki toplam ürün sayısı
    const allgemeinCount = await prisma.product.count({
      where: {
        categoryId: allgemeinCategory.id,
      },
    });

    console.log(`📊 "Allgemein" kategorisindeki toplam ürün sayısı: ${allgemeinCount}`);

    console.log('\n✅ İşlem tamamlandı!');
  } catch (error) {
    console.error('❌ Hata oluştu:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
updateGenelToAllgemein()
  .then(() => {
    console.log('\n🎉 Script başarıyla tamamlandı.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script hatası:', error);
    process.exit(1);
  });

