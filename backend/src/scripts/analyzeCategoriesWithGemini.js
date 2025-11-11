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
 * Slug oluştur (category.service.js'den alındı)
 */
function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Gemini API ile ürünleri analiz et ve her ürün için uygun kategori öner
 * AI kendi kategorileri bulur (market sipariş uygulaması için)
 */
async function analyzeProductsAndSuggestCategories(products) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Ürün listesini formatla
    const productList = products.map((product, index) => `${index + 1}. ${product.name}`).join('\n');

    const prompt = `Sen bir market sipariş uygulaması için ürün kategorileri belirleyen bir uzmansın.
Aşağıdaki ürünleri analiz et ve her ürün için en uygun kategoriyi öner.

Ürünler:
${productList}

Her satır için "Ürün No: Kategori Adı" formatında döndür. Kategori adları kesinlikle Almanca olmalı.
Sadece kategori adını yaz, başka açıklama yapma.

Örnek format:
1: Meyve ve Sebze
2: Et, Tavuk ve Balık
3: Şarküteri ve Kahvaltılık
4: Süt ve Süt Ürünleri
5: Ekmek ve Fırın Ürünleri
6: Temel Gıda
7: Atıştırmalık
8: İçecekler
9: Kişisel Bakım
10: Ev Bakım ve Temizlik
11: Bebek Ürünleri
12: Evcil Hayvan Ürünleri
13: Hazır Yemek ve Dondurulmuş
14: Alkollü İçecekler
15: Organik ve Diyet
16: Ev ve Yaşam
...

Yanıt:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text().trim();

    // Yanıtı parse et
    const mappings = {};
    const lines = responseText.split('\n').filter(line => line.trim());

    for (const line of lines) {
      // "1: Meyve ve Sebze" veya "1:Meyve ve Sebze" veya "Ürün 1: Meyve ve Sebze" gibi formatları destekle
      const match = line.match(/(\d+)\s*[:=]\s*(.+)/);
      if (match) {
        const productIndex = parseInt(match[1], 10) - 1; // 0-based index
        const categoryName = match[2].trim();

        if (productIndex >= 0 && productIndex < products.length && categoryName) {
          mappings[productIndex] = categoryName;
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
 * Kategori adını DB'deki kategoriye eşleştir veya yeni kategori oluştur
 * @param {string} categoryName - AI'dan gelen kategori adı
 * @param {Object} existingCategories - DB'deki mevcut kategoriler (name -> category map)
 * @returns {Promise<Object>} - Kategori objesi
 */
async function getOrCreateCategory(categoryName, existingCategories) {
  const normalizedName = categoryName.trim();
  const normalizedKey = normalizedName.toLowerCase();

  // Önce tam eşleşme kontrolü
  if (existingCategories[normalizedKey]) {
    return existingCategories[normalizedKey];
  }

  // Kısmi eşleşme kontrolü (içeriyor mu?)
  for (const [key, category] of Object.entries(existingCategories)) {
    if (key.includes(normalizedKey) || normalizedKey.includes(key)) {
      return category;
    }
  }

  // Eşleşme bulunamadı, yeni kategori oluştur
  const slug = generateSlug(normalizedName);
  
  // Slug'un benzersiz olduğundan emin ol (eğer varsa numara ekle)
  let finalSlug = slug;
  let counter = 1;
  while (true) {
    const existing = await prisma.category.findUnique({
      where: { slug: finalSlug },
    });
    
    if (!existing) {
      break;
    }
    
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  console.log(`   📁 Yeni kategori oluşturuluyor: "${normalizedName}" (slug: ${finalSlug})`);

  const newCategory = await prisma.category.create({
    data: {
      name: normalizedName,
      slug: finalSlug,
      isActive: true,
    },
  });

  // Cache'e ekle
  existingCategories[normalizedKey] = newCategory;

  return newCategory;
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

    // Kategorileri hızlı arama için map'e çevir (name -> category)
    const existingCategoriesMap = {};
    allCategories.forEach(cat => {
      existingCategoriesMap[cat.name.toLowerCase()] = cat;
    });

    console.log(`📋 Mevcut kategoriler (${allCategories.length} adet):`);
    allCategories.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.name}`);
    });
    console.log('');

    console.log('🚀 Tüm ürünler Gemini\'ye gönderiliyor...');
    console.log('   AI kendi kategorileri bulacak ve önerecek.\n');

    // AI'dan kategori önerileri al
    const categoryNameMappings = await analyzeProductsAndSuggestCategories(products);

    if (!categoryNameMappings || Object.keys(categoryNameMappings).length === 0) {
      console.log('❌ Gemini\'den kategori önerisi alınamadı.');
      return;
    }

    console.log(`✅ ${Object.keys(categoryNameMappings).length} ürün için kategori önerisi alındı.\n`);

    // AI'ın önerdiği kategorileri göster
    const suggestedCategories = new Set(Object.values(categoryNameMappings));
    console.log(`📋 AI'ın önerdiği kategoriler (${suggestedCategories.size} adet):`);
    Array.from(suggestedCategories).forEach((catName, index) => {
      const exists = existingCategoriesMap[catName.toLowerCase()] ? '✅ (Mevcut)' : '🆕 (Yeni)';
      console.log(`   ${index + 1}. ${catName} ${exists}`);
    });
    console.log('');

    // Kategori eşleştirmelerini DB objelerine çevir (yoksa oluştur)
    const categoryMappings = {};
    let newCategoriesCount = 0;

    for (let i = 0; i < products.length; i++) {
      const categoryName = categoryNameMappings[i];
      if (categoryName) {
        const category = await getOrCreateCategory(categoryName, existingCategoriesMap);
        categoryMappings[i] = category;
        
        // Yeni kategori oluşturuldu mu kontrol et
        if (!allCategories.find(c => c.id === category.id)) {
          newCategoriesCount++;
        }
      }
    }

    if (newCategoriesCount > 0) {
      console.log(`\n✨ ${newCategoriesCount} yeni kategori veritabanına eklendi.\n`);
    }

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
    console.log(`📦 Toplam: ${products.length}`);
    console.log(`🆕 Yeni Kategori: ${newCategoriesCount}\n`);

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

