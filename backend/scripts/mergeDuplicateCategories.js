/**
 * Aynı isimdeki kategorileri birleştirir
 * - Aynı isimdeki kategorileri bulur
 * - En çok ürünü olan kategoriyi tutar (veya ilk oluşturulanı)
 * - Diğer kategorilerin ürünlerini tutulan kategoriye taşır
 * - Silinen kategorileri siler
 */

import prisma from '../src/config/prisma.js';

async function mergeDuplicateCategories() {
  try {
    console.log('🔍 Aynı isimdeki kategoriler kontrol ediliyor...\n');

    // Tüm kategorileri ürün sayılarıyla birlikte çek
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: [
        { createdAt: 'asc' }, // İlk oluşturulan önce
        { _count: { products: 'desc' } }, // En çok ürünü olan önce
      ],
    });

    console.log(`Toplam kategori sayısı: ${categories.length}\n`);

    // Aynı isimdeki kategorileri grupla
    const categoryGroups = {};
    categories.forEach((category) => {
      const normalizedName = category.name.trim();
      if (!categoryGroups[normalizedName]) {
        categoryGroups[normalizedName] = [];
      }
      categoryGroups[normalizedName].push(category);
    });

    // Sadece birden fazla kategori olan grupları filtrele
    const duplicateGroups = Object.entries(categoryGroups).filter(
      ([name, cats]) => cats.length > 1
    );

    if (duplicateGroups.length === 0) {
      console.log('✅ Aynı isimde tekrarlanan kategori bulunamadı.');
      return;
    }

    console.log(`📋 ${duplicateGroups.length} adet tekrarlanan kategori grubu bulundu:\n`);

    // Her grup için bilgi göster
    duplicateGroups.forEach(([name, cats]) => {
      console.log(`  "${name}":`);
      cats.forEach((cat) => {
        console.log(
          `    - ID: ${cat.id}, Slug: ${cat.slug}, Ürün: ${cat._count.products}, Oluşturulma: ${cat.createdAt.toISOString()}`
        );
      });
      console.log('');
    });

    // Kullanıcıdan onay al
    console.log('⚠️  Bu işlem şunları yapacak:');
    console.log('  1. Her grup için en çok ürünü olan kategoriyi tutacak');
    console.log('  2. Diğer kategorilerin ürünlerini tutulan kategoriye taşıyacak');
    console.log('  3. Silinen kategorileri silecek\n');

    // İşlemi başlat
    let totalMerged = 0;
    let totalProductsMoved = 0;
    let totalCategoriesDeleted = 0;

    for (const [name, cats] of duplicateGroups) {
      // En çok ürünü olan kategoriyi bul (veya ilk oluşturulanı)
      const keepCategory = cats.reduce((prev, current) => {
        if (current._count.products > prev._count.products) {
          return current;
        }
        if (
          current._count.products === prev._count.products &&
          current.createdAt < prev.createdAt
        ) {
          return current;
        }
        return prev;
      });

      const deleteCategories = cats.filter((cat) => cat.id !== keepCategory.id);

      console.log(`\n🔄 "${name}" kategorisi birleştiriliyor...`);
      console.log(`   Tutulacak: ${keepCategory.slug} (${keepCategory._count.products} ürün)`);

      for (const deleteCat of deleteCategories) {
        console.log(`   Silinecek: ${deleteCat.slug} (${deleteCat._count.products} ürün)`);

        // Ürünleri taşı
        if (deleteCat._count.products > 0) {
          const updateResult = await prisma.product.updateMany({
            where: {
              categoryId: deleteCat.id,
            },
            data: {
              categoryId: keepCategory.id,
            },
          });

          totalProductsMoved += updateResult.count;
          console.log(`     ✅ ${updateResult.count} ürün taşındı`);
        }

        // Kategoriyi sil
        await prisma.category.delete({
          where: {
            id: deleteCat.id,
          },
        });

        totalCategoriesDeleted++;
        console.log(`     ✅ Kategori silindi`);
      }

      totalMerged++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Özet:');
    console.log(`   Birleştirilen grup sayısı: ${totalMerged}`);
    console.log(`   Taşınan ürün sayısı: ${totalProductsMoved}`);
    console.log(`   Silinen kategori sayısı: ${totalCategoriesDeleted}`);
    console.log('='.repeat(60));
    console.log('\n✅ Birleştirme işlemi tamamlandı!');
  } catch (error) {
    console.error('❌ Hata:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
mergeDuplicateCategories()
  .then(() => {
    console.log('\n✅ Script başarıyla tamamlandı.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script başarısız:', error);
    process.exit(1);
  });

