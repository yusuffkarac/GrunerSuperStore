import dotenv from 'dotenv';
import prisma from '../config/prisma.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// .env dosyasını yükle
dotenv.config();

// ES modules için __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log klasörünü oluştur
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// AI client'ları (lazy initialization)
let geminiClient = null;
let openaiClient = null;

/**
 * Gemini client'ı başlat
 */
function getGeminiClient() {
  if (!geminiClient) {
if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable bulunamadı!');
    }
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return geminiClient;
}

/**
 * OpenAI client'ı başlat
 */
function getOpenAIClient() {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable bulunamadı!');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Slug oluştur (category.service.js'den alındı)
 */
function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Tanımlı kategoriler (sadece bunlar kullanılacak)
const DEFINED_CATEGORIES = [
  'Obst und Gemüse',
  'Fleisch, Geflügel und Fisch',
  'Feinkost und Frühstück',
  'Milch- und Molkereiprodukte',
  'Brot und Backwaren',
  'Grundnahrungsmittel',
  'Snacks',
  'Getränke',
  'Körperpflege',
  'Haushalts- und Reinigungsmittel',
  'Babyprodukte',
  'Haustierprodukte',
  'Fertiggerichte und Tiefkühlprodukte',
  'Alkoholische Getränke',
  'Bio und Diät',
  'Haushalt und Wohnen',
];

/**
 * AI ile ürünleri analiz et ve verilen kategorilerden birini seç
 * @param {string} aiProvider - 'gemini' veya 'gpt'
 * @param {Array} products - Ürün listesi
 * @param {Array} availableCategories - Kullanılabilir kategoriler
 */
async function analyzeProductsAndSuggestCategories(aiProvider, products, availableCategories) {
  try {
    // Ürün listesini formatla
    const productList = products.map((product, index) => `${index + 1}. ${product.name}`).join('\n');

    // Kategori listesini formatla
    const categoryList = availableCategories.map((cat, index) => `${index + 1}. ${cat.name}`).join('\n');

    const prompt = `Sen bir market sipariş uygulaması için ürün kategorileri belirleyen bir uzmansın.
Aşağıdaki ürünleri analiz et ve her ürün için VERİLEN KATEGORİLER LİSTESİNDEN en uygun kategoriyi seç.

Ürünler:
${productList}

Kullanılacak kategoriler (SADECE BUNLARI KULLAN):
${categoryList}

Her satır için "Ürün No: Kategori No" formatında döndür. Sadece numaraları kullan, başka açıklama yapma.
Verilen kategoriler dışında kategori kullanma!

Format (her satır bir ürün için):
1: 3
2: 1
3: 2
...

Yanıt:`;

    let responseText;

    if (aiProvider === 'gemini') {
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
      responseText = response.text().trim();
    } else if (aiProvider === 'gpt') {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // veya 'gpt-4', 'gpt-3.5-turbo'
        messages: [
          {
            role: 'system',
            content: 'Sen bir market sipariş uygulaması için ürün kategorileri belirleyen bir uzmansın. Verilen formatı kesinlikle takip et.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      });
      responseText = completion.choices[0].message.content.trim();
    } else {
      throw new Error(`Bilinmeyen AI provider: ${aiProvider}`);
    }

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
            categoryIndex >= 0 && categoryIndex < availableCategories.length) {
          mappings[productIndex] = availableCategories[categoryIndex];
        }
      }
    }

    return mappings;
  } catch (error) {
    console.error(`   ⚠️  ${aiProvider.toUpperCase()} API hatası: ${error.message}`);
    return null;
  }
}

/**
 * Tüm ürünleri "Allgemein" kategorisine taşı, eski kategorileri sil (opsiyonel), yeni kategorileri oluştur ve AI ile ata
 * @param {number|null} limit - İşlenecek ürün sayısı (null = tümü)
 * @param {boolean} deleteCategories - Eski kategorileri sil (varsayılan: false)
 * @param {string} aiProvider - AI provider: 'gemini' veya 'gpt' (varsayılan: 'gemini')
 * @param {boolean} moveAllProducts - Tüm ürünleri "Allgemein"e taşı (varsayılan: false)
 */
async function analyzeCategoriesWithGemini(limit = null, deleteCategories = false, aiProvider = 'gemini', moveAllProducts = false) {
  const startTime = Date.now();
  
  try {
    console.log(`🔄 Kategori yeniden yapılandırma başlatılıyor (AI: ${aiProvider.toUpperCase()})...\n`);
    
    // AI provider kontrolü
    if (aiProvider === 'gemini') {
      if (!process.env.GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY environment variable bulunamadı!');
        console.error('   Lütfen .env dosyanıza GEMINI_API_KEY ekleyin veya --ai gpt kullanın.');
        process.exit(1);
      }
    } else if (aiProvider === 'gpt') {
      if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY environment variable bulunamadı!');
        console.error('   Lütfen .env dosyanıza OPENAI_API_KEY ekleyin veya --ai gemini kullanın.');
        process.exit(1);
      }
    } else {
      console.error(`❌ Geçersiz AI provider: ${aiProvider}`);
      console.error('   Desteklenen değerler: gemini, gpt');
      process.exit(1);
    }
    
    if (deleteCategories) {
      console.log('⚠️  UYARI: Bu işlem tüm ürünleri "Allgemein" kategorisine taşıyacak ve diğer kategorileri silecek!\n');
    } else {
      console.log('ℹ️  Eski kategoriler korunacak (sadece yeni kategoriler eklenecek).\n');
    }

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
      console.log('📁 "Allgemein" kategorisi bulunamadı, oluşturuluyor...');
      allgemeinCategory = await prisma.category.create({
        data: {
          name: 'Allgemein',
          slug: 'allgemein',
          isActive: true,
        },
      });
      console.log(`✅ "Allgemein" kategorisi oluşturuldu (ID: ${allgemeinCategory.id})\n`);
    } else {
      console.log(`✅ "Allgemein" kategorisi bulundu (ID: ${allgemeinCategory.id})\n`);
    }

    // ADIM 1: Tüm ürünleri "Allgemein" kategorisine taşı (sadece --move-all flag'i varsa)
    if (moveAllProducts) {
      console.log('📦 ADIM 1: Tüm ürünler "Allgemein" kategorisine taşınıyor...');
      const updateResult = await prisma.product.updateMany({
        data: {
          categoryId: allgemeinCategory.id,
        },
      });
      console.log(`✅ ${updateResult.count} ürün "Allgemein" kategorisine taşındı.\n`);
    } else {
      console.log('📦 ADIM 1: "Allgemein" kategorisindeki ürünler kontrol ediliyor...');
      
      // Önce kaç ürün var kontrol et
      const allgemeinProductCount = await prisma.product.count({
        where: {
          categoryId: allgemeinCategory.id,
        },
      });
      
      console.log(`ℹ️  "Allgemein" kategorisinde ${allgemeinProductCount} ürün bulundu.`);
      
      if (allgemeinProductCount === 0) {
        console.log(`\n⚠️  "Allgemein" kategorisinde işlenecek ürün yok.`);
        console.log(`   Tüm ürünleri "Allgemein" kategorisine taşımak isterseniz --move-all flag'ini kullanın.`);
        return;
      }
      
      console.log(`✅ İşlenecek ürünler: ${allgemeinProductCount}\n`);
    }

    // ADIM 2: "Allgemein" hariç tüm kategorileri sil (opsiyonel)
    if (deleteCategories) {
      console.log('🗑️  ADIM 2: "Allgemein" hariç tüm kategoriler siliniyor...');
      const deleteResult = await prisma.category.deleteMany({
        where: {
          id: {
            not: allgemeinCategory.id,
          },
        },
      });
      console.log(`✅ ${deleteResult.count} kategori silindi.\n`);
    } else {
      console.log('⏭️  ADIM 2: Eski kategoriler korunuyor (silme işlemi atlandı).\n');
    }

    // ADIM 3: Tanımlı kategorileri oluştur
    console.log('📁 ADIM 3: Yeni kategoriler oluşturuluyor...');
    const createdCategories = [];
    
    for (const categoryName of DEFINED_CATEGORIES) {
      const slug = generateSlug(categoryName);
      
      // Slug'un benzersiz olduğundan emin ol
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

      const category = await prisma.category.create({
        data: {
          name: categoryName,
          slug: finalSlug,
          isActive: true,
        },
      });
      
      createdCategories.push(category);
      console.log(`   ✅ ${categoryName} (slug: ${finalSlug})`);
    }
    
    console.log(`\n✅ ${createdCategories.length} kategori oluşturuldu.\n`);

    // ADIM 4: Ürünleri getir (limit varsa uygula)
    console.log('📊 ADIM 4: Ürünler getiriliyor...');
    const productsQuery = {
      where: {
        categoryId: allgemeinCategory.id,
      },
      select: {
        id: true,
        name: true,
        categoryId: true,
      },
    };

    if (limit && limit > 0) {
      productsQuery.take = limit;
    }

    const products = await prisma.product.findMany(productsQuery);

    if (products.length === 0) {
      console.log(`ℹ️  "Allgemein" kategorisinde analiz edilecek ürün bulunamadı.`);
      return;
    }

    console.log(`✅ ${products.length} ürün bulundu.\n`);

    // ADIM 5: AI'a ürünleri gönder ve kategorileri ata
    console.log(`🚀 ADIM 5: ${aiProvider.toUpperCase()} ürünleri analiz ediyor ve kategorilere atıyor...\n`);
    
    const categoryMappings = await analyzeProductsAndSuggestCategories(aiProvider, products, createdCategories);

    if (!categoryMappings || Object.keys(categoryMappings).length === 0) {
      console.log(`❌ ${aiProvider.toUpperCase()}'den kategori eşleştirmesi alınamadı.`);
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
        console.log(`   ⚠️  Bu ürün için kategori eşleştirmesi bulunamadı. "Allgemein" kategorisinde kalacak.`);
        failedCount++;
        results.push({
          productId: product.id,
          product: product.name,
          status: 'failed',
          reason: 'Kategori eşleştirmesi bulunamadı',
          oldCategoryId: product.categoryId,
          oldCategory: 'Allgemein',
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
          productId: product.id,
          product: product.name,
          status: 'success',
          oldCategoryId: product.categoryId,
          oldCategory: 'Allgemein',
          newCategoryId: selectedCategory.id,
          newCategory: selectedCategory.name,
        });
      } catch (error) {
        console.error(`   ❌ Hata: ${error.message}\n`);
        failedCount++;
        results.push({
          productId: product.id,
          product: product.name,
          status: 'error',
          error: error.message,
          oldCategoryId: product.categoryId,
          oldCategory: 'Allgemein',
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
    console.log(`📁 Oluşturulan Kategori: ${createdCategories.length}\n`);

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

    // Log dosyasına kaydet (rollback için)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(logDir, `category-analysis-${timestamp}.json`);
    
    const logData = {
      executedAt: new Date().toISOString(),
      summary: {
        totalProducts: products.length,
        successCount,
        failedCount,
        createdCategoriesCount: createdCategories.length,
      },
      allgemeinCategory: {
        id: allgemeinCategory.id,
        name: allgemeinCategory.name,
        slug: allgemeinCategory.slug,
      },
      createdCategories: createdCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
      })),
      changes: results.filter(r => r.status === 'success').map(r => ({
        productId: r.productId,
        productName: r.product,
        oldCategoryId: r.oldCategoryId,
        oldCategoryName: r.oldCategory,
        newCategoryId: r.newCategoryId,
        newCategoryName: r.newCategory,
      })),
      errors: results.filter(r => r.status !== 'success'),
    };
    
    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2), 'utf8');
    console.log(`\n📝 Rollback log dosyası kaydedildi: ${logFile}`);
    console.log(`   Geri almak için: npm run rollback-categories ${path.basename(logFile)}`);

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
// Parametreleri parse et
const args = process.argv.slice(2);
let limit = null;
let deleteCategories = false;
let aiProvider = 'gemini'; // varsayılan
let moveAllProducts = false; // varsayılan: false (sadece Allgemein'deki ürünleri işle)

// Önce --ai parametresini kontrol et
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--ai' && i + 1 < args.length) {
    aiProvider = args[i + 1].toLowerCase();
    args.splice(i, 2); // Bu iki argümanı çıkar
    i--; // Index'i ayarla
  } else if (arg === '--delete-categories' || arg === '-d') {
    deleteCategories = true;
    args.splice(i, 1);
    i--;
  } else if (arg === '--move-all' || arg === '-m') {
    moveAllProducts = true;
    args.splice(i, 1);
    i--;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Kategori Analizi Script'i

Kullanım:
  npm run analyze-categories [limit] [--delete-categories] [--ai provider] [--move-all]

Parametreler:
  limit                    İşlenecek ürün sayısı (opsiyonel, belirtilmezse tümü)
  --delete-categories, -d  Eski kategorileri sil (varsayılan: false, kategoriler korunur)
  --ai provider            AI provider: 'gemini' veya 'gpt' (varsayılan: gemini)
  --move-all, -m           Tüm ürünleri "Allgemein" kategorisine taşı (varsayılan: false)

Örnekler:
  npm run analyze-categories                           # Allgemein'deki ürünler, Gemini
  npm run analyze-categories 50                       # Allgemein'deki 50 ürün, Gemini
  npm run analyze-categories --ai gpt                 # Allgemein'deki ürünler, GPT
  npm run analyze-categories --move-all               # Tüm ürünleri taşı, sonra işle
  npm run analyze-categories 100 --ai gpt --move-all  # Tüm ürünleri taşı, 100'ünü işle, GPT

NOT: npm run kullanırken -- ile ayırın:
  npm run analyze-categories -- 50 --ai gpt
    `);
    process.exit(0);
  }
}

// Eğer --ai bulunamadıysa, 'gpt' veya 'gemini' kelimesini doğrudan kontrol et
if (aiProvider === 'gemini') {
  for (const arg of args) {
    if (arg.toLowerCase() === 'gpt' || arg.toLowerCase() === 'gemini') {
      aiProvider = arg.toLowerCase();
      break;
    }
  }
}

// Kalan argümanlardan limit'i bul
for (const arg of args) {
  if (!arg.startsWith('--') && !arg.startsWith('-') && arg.toLowerCase() !== 'gpt' && arg.toLowerCase() !== 'gemini') {
    const parsedLimit = parseInt(arg, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = parsedLimit;
      break;
    }
  }
}

if (limit !== null && limit < 1) {
  console.error('❌ Geçersiz limit değeri. Pozitif bir sayı girin.');
  process.exit(1);
}

if (aiProvider !== 'gemini' && aiProvider !== 'gpt') {
  console.error(`❌ Geçersiz AI provider: ${aiProvider}`);
  console.error('   Desteklenen değerler: gemini, gpt');
  process.exit(1);
}

analyzeCategoriesWithGemini(limit, deleteCategories, aiProvider, moveAllProducts)
  .then(() => {
    console.log('\n🎉 Script başarıyla tamamlandı.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script hatası:', error);
    process.exit(1);
  });

