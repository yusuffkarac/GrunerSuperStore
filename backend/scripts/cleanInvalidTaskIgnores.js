/**
 * Geçersiz UUID'lere sahip product_task_ignores kayıtlarını temizler
 */

import prisma from '../src/config/prisma.js';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function cleanInvalidTaskIgnores() {
  try {
    console.log('Geçersiz UUID kayıtları kontrol ediliyor...');

    // Tüm kayıtları çek
    const allIgnores = await prisma.productTaskIgnore.findMany({
      select: {
        id: true,
        productId: true,
        category: true,
      },
    });

    console.log(`Toplam kayıt sayısı: ${allIgnores.length}`);

    // Geçersiz UUID'lere sahip kayıtları bul
    const invalidRecords = allIgnores.filter(
      (record) => !record.productId || !uuidRegex.test(record.productId)
    );

    console.log(`Geçersiz UUID'ye sahip kayıt sayısı: ${invalidRecords.length}`);

    if (invalidRecords.length === 0) {
      console.log('Geçersiz kayıt bulunamadı. Temizlik gerekmiyor.');
      return;
    }

    // Geçersiz kayıtları göster
    console.log('\nGeçersiz kayıtlar:');
    invalidRecords.forEach((record) => {
      console.log(`  - ID: ${record.id}, productId: ${record.productId}, category: ${record.category}`);
    });

    // Geçersiz kayıtları sil
    const deletePromises = invalidRecords.map((record) =>
      prisma.productTaskIgnore.delete({
        where: { id: record.id },
      })
    );

    await Promise.all(deletePromises);

    console.log(`\n✅ ${invalidRecords.length} geçersiz kayıt silindi.`);
  } catch (error) {
    console.error('❌ Hata:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
cleanInvalidTaskIgnores()
  .then(() => {
    console.log('\n✅ Temizlik tamamlandı.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Temizlik başarısız:', error);
    process.exit(1);
  });

