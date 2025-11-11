import dotenv from 'dotenv';
import prisma from '../config/prisma.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// .env dosyasını yükle
dotenv.config();

// Gemini API anahtarı kontrolü
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY environment variable bulunamadı!');
  console.error('   Lütfen .env dosyanıza GEMINI_API_KEY ekleyin.');
  process.exit(1);
}

// Gemini AI client'ı oluştur
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Gemini API ile tüm ürünleri toplu olarak analiz et
 * Verilen kategoriler listesinden her ürün için en uygun kategoriyi seçer
 */
async function analyzeProductsBatch(products, categories) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Ürün listesini formatla
    const productList = products.map((product, index) => `${index + 1}. ${product.name}`).join('\n');

    // Kategori listesini formatla
    const categoryList = categories.map((cat, index) => `${index + 1}. ${cat.name}`).join('\n');

    const prompt = `Aşağıdaki ürünleri analiz et ve her ürün için verilen kategoriler listesinden en uygun kategoriyi seç.
Her satır için "Ürün No: Kategori No" formatında döndür. Sadece numaraları kullan, başka açıklama yapma.

Ürünler:
${productList}

Mevcut kategoriler:
${categoryList}

Format (her satır bir ürün için):
1: 3
2: 1
3: 2
...

Yanıt:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text().trim();

    // Yanıtı parse et
    const mappings = {};
    const lines = responseText.split('\n').filter(line => line.trim());

    for (const line of lines) {
      // "1: 3" veya "1:3" veya "Ürün 1: Kategori 3" gibi formatları destekle
      const match = line.match(/(\d+)\s*[:=]\s*(\d+)/);
      if (match) {
        const productIndex = parseInt(match[1], 10) - 1; // 0-based index
        const categoryIndex = parseInt(match[2], 10) - 1; // 0-based index

        if (productIndex >= 0 && productIndex < products.length &&
            categoryIndex >= 0 && categoryIndex < categories.length) {
          mappings[productIndex] = categories[categoryIndex];
        }
      }
    }

    return mappings;
  } catch (error) {
    console.error(`   ⚠️  Gemini API hatası: ${error.message}`);
    return null;
  }
}

/**
 * Kategori adını veya numarasını kategori objesine çevir
 */
function parseCategorySelection(selection, categories) {
  // Önce numara olarak kontrol et
  const categoryNumber = parseInt(selection, 10);
  if (!isNaN(categoryNumber) && categoryNumber >= 1 && categoryNumber <= categories.length) {
    return categories[categoryNumber - 1];
  }

  // Kategori adı olarak ara
  const matchingCategory = categories.find(
    cat => cat.name.toLowerCase() === selection.toLowerCase() ||
           cat.name.toLowerCase().includes(selection.toLowerCase()) ||
           selection.toLowerCase().includes(cat.name.toLowerCase())
  );

  if (matchingCategory) {
    return matchingCategory;
  }

  // Eğer eşleşme bulunamazsa, ilk kelimeyi kontrol et
  const firstWord = selection.split(/[\s,.-]/)[0].toLowerCase();
  const partialMatch = categories.find(
    cat => cat.name.toLowerCase().startsWith(firstWord) ||
           firstWord.startsWith(cat.name.toLowerCase().split(/[\s,.-]/)[0])
  );

  return partialMatch || null;
}


/**
 * "Genel" kategorisindeki ürünleri Gemini ile analiz et ve kategorilerini güncelle
 */
async function analyzeCategoriesWithGemini(limit = 10) {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Gemini ile kategori analizi başlatılıyor...\n');

    // "Genel" veya "Allgemein" kategorisini bul
    const genelCategory = await prisma.category.findFirst({
      where: {
        OR: [
          { name: 'Genel' },
          { slug: 'genel' },
          { name: 'Allgemein' },
          { slug: 'allgemein' },
        ],
      },
    });

    if (!genelCategory) {
      console.log('❌ "Genel" veya "Allgemein" kategorisi bulunamadı.');
      return;
    }

    console.log(`✅ Kategori bulundu: ${genelCategory.name} (ID: ${genelCategory.id})\n`);

    // Kategorideki ürünleri getir (limit ile)
    const products = await prisma.product.findMany({
      where: {
        categoryId: genelCategory.id,
      },
      take: limit,
      select: {
        id: true,
        name: true,
        categoryId: true,
      },
    });

    if (products.length === 0) {
      console.log(`ℹ️  "${genelCategory.name}" kategorisinde analiz edilecek ürün bulunamadı.`);
      return;
    }

    console.log(`📊 ${products.length} ürün analiz edilecek:\n`);

    // Tüm aktif kategorileri bir kere getir (performans için)
    const allCategories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    // Mevcut kategorisini listeden çıkar (çünkü zaten oradan taşıyoruz)
    const availableCategories = allCategories.filter(
      cat => cat.id !== genelCategory.id
    );

    if (availableCategories.length === 0) {
      console.log(`❌ Analiz için uygun kategori bulunamadı. "${genelCategory.name}" dışında en az bir kategori olmalı.`);
      return;
    }

    console.log(`📋 Seçilebilecek kategoriler (${availableCategories.length} adet):`);
    availableCategories.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.name}`);
    });
    console.log('');

    console.log('🚀 Tüm ürünler Gemini\'ye gönderiliyor...\n');

    // Tüm ürünleri toplu olarak Gemini'ye gönder
    const categoryMappings = await analyzeProductsBatch(products, availableCategories);

    if (!categoryMappings || Object.keys(categoryMappings).length === 0) {
      console.log('❌ Gemini\'den kategori eşleştirmesi alınamadı.');
      return;
    }

    console.log(`✅ ${Object.keys(categoryMappings).length} ürün için kategori eşleştirmesi alındı.\n`);

    let successCount = 0;
    let failedCount = 0;
    const results = [];

    // Her ürün için kategoriyi güncelle
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const selectedCategory = categoryMappings[i];

      console.log(`[${i + 1}/${products.length}] 🔍 İşleniyor: "${product.name}"`);

      if (!selectedCategory) {
        console.log(`   ⚠️  Bu ürün için kategori eşleştirmesi bulunamadı.`);
        failedCount++;
        results.push({
          product: product.name,
          status: 'failed',
          reason: 'Kategori eşleştirmesi bulunamadı',
        });
        continue;
      }

      try {
        console.log(`   ✅ Seçilen kategori: "${selectedCategory.name}" (ID: ${selectedCategory.id})`);

        // Ürünün kategorisini güncelle
        await prisma.product.update({
          where: {
            id: product.id,
          },
          data: {
            categoryId: selectedCategory.id,
          },
        });

        console.log(`   ✅ Ürün kategorisi güncellendi!\n`);
        successCount++;
        results.push({
          product: product.name,
          status: 'success',
          oldCategory: genelCategory.name,
          newCategory: selectedCategory.name,
        });
      } catch (error) {
        console.error(`   ❌ Hata: ${error.message}\n`);
        failedCount++;
        results.push({
          product: product.name,
          status: 'error',
          error: error.message,
        });
      }
    }

    // Özet rapor
    console.log('\n' + '='.repeat(60));
    console.log('📊 ÖZET RAPOR');
    console.log('='.repeat(60));
    console.log(`✅ Başarılı: ${successCount}`);
    console.log(`❌ Başarısız: ${failedCount}`);
    console.log(`📦 Toplam: ${products.length}\n`);

    if (results.length > 0) {
      console.log('📋 Detaylı Sonuçlar:');
      results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.product}`);
        console.log(`   Durum: ${result.status === 'success' ? '✅ Başarılı' : '❌ Başarısız'}`);
        if (result.status === 'success') {
          console.log(`   Eski Kategori: ${result.oldCategory}`);
          console.log(`   Yeni Kategori: ${result.newCategory}`);
        } else {
          console.log(`   Sebep: ${result.reason || result.error}`);
        }
      });
    }

    console.log('\n✅ İşlem tamamlandı!');
    
    // Süre hesaplama
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const minutes = Math.floor(duration / 60);
    const seconds = (duration % 60).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('⏱️  PERFORMANS BİLGİLERİ');
    console.log('='.repeat(60));
    if (minutes > 0) {
      console.log(`⏰ Toplam Süre: ${minutes} dakika ${seconds} saniye`);
    } else {
      console.log(`⏰ Toplam Süre: ${seconds} saniye`);
    }
    console.log(`📊 İşlenen Ürün Sayısı: ${products.length}`);
    console.log(`⚡ Ortalama Süre/Ürün: ${(duration / products.length).toFixed(2)} saniye`);
    console.log('='.repeat(60));
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.error('\n❌ Hata oluştu:', error);
    console.error(`⏰ Hata Öncesi Süre: ${duration} saniye`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
const limit = process.argv[2] ? parseInt(process.argv[2], 10) : 10;

if (isNaN(limit) || limit < 1) {
  console.error('❌ Geçersiz limit değeri. Pozitif bir sayı girin.');
  process.exit(1);
}

analyzeCategoriesWithGemini(limit)
  .then(() => {
    console.log('\n🎉 Script başarıyla tamamlandı.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script hatası:', error);
    process.exit(1);
  });

