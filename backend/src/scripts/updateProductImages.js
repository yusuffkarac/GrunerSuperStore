import dotenv from 'dotenv';
import prisma from '../config/prisma.js';
import { fileURLToPath } from 'url';
import path from 'path';
import https from 'https';
import http from 'http';
import { getJson } from 'serpapi';

// .env dosyasını yükle
dotenv.config();

// ES modules için __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * HTTP isteği yap (Node.js için fetch alternatifi)
 */
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'GrunerSuperStore/1.0 (Contact: info@grunersuperstore.com)',
          ...options.headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve({ ok: true, status: res.statusCode, json: () => JSON.parse(data) });
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

/**
 * SerpAPI ile Google Images'tan ürün fotoğrafını çek
 * @param {string} productName - Ürün adı
 * @returns {Promise<string|null>} Fotoğraf URL'i veya null
 */
async function fetchImageFromGoogleImages(productName) {
  if (!productName || productName.trim().length === 0) {
    return null;
  }

  const apiKey = process.env.SERPAPI_KEY || '75d6f3ee666e92c37cd318bc828ff29411afbfd5411b97f4b15d497c81e07156';

  if (!apiKey) {
    console.error('  ⚠️  SERPAPI_KEY environment variable bulunamadı!');
    return null;
  }

  try {
    return new Promise((resolve, reject) => {
      getJson(
        {
          q: productName,
          engine: 'google_images',
          ijn: '0',
          api_key: apiKey,
          num: 5, // İlk 5 sonucu al
        },
        (json) => {
          try {
            if (json && json.images_results && json.images_results.length > 0) {
              // İlk sonucu al (en uygun)
              const firstResult = json.images_results[0];
              const imageUrl = firstResult.original || firstResult.link || null;
              
              if (imageUrl) {
                resolve(imageUrl);
              } else {
                resolve(null);
              }
            } else {
              resolve(null);
            }
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error(`  ❌ Ürün "${productName}" için hata:`, error.message);
    return null;
  }
}

/**
 * OpenFoodFacts API'sinden ürün fotoğrafını çek (fallback)
 * @param {string} barcode - Ürün barkodu
 * @returns {Promise<string|null>} Fotoğraf URL'i veya null
 */
async function fetchImageFromOpenFoodFacts(barcode) {
  if (!barcode || barcode.trim().length === 0) {
    return null;
  }

  // Barcode'u temizle (sadece rakamlar)
  const cleanBarcode = barcode.replace(/\D/g, '');
  
  if (cleanBarcode.length < 8) {
    return null; // Geçersiz barcode
  }

  try {
    const apiUrl = `https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json`;
    
    const response = await httpRequest(apiUrl);

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Ürün bulunamadı
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.status !== 1 || !data.product) {
      return null; // Ürün bulunamadı veya geçersiz response
    }

    const product = data.product;

    // Fotoğraf URL'lerini öncelik sırasına göre ara
    // 1. selected_images.front.display.en (en yüksek kalite)
    if (
      product.selected_images?.front?.display?.en
    ) {
      return product.selected_images.front.display.en;
    }

    // 2. selected_images.front.small.en
    if (product.selected_images?.front?.small?.en) {
      return product.selected_images.front.small.en;
    }

    // 3. image_url (fallback)
    if (product.image_url) {
      return product.image_url;
    }

    // 4. image_front_url
    if (product.image_front_url) {
      return product.image_front_url;
    }

    // 5. image_front_small_url
    if (product.image_front_small_url) {
      return product.image_front_small_url;
    }

    return null;
  } catch (error) {
    console.error(`  ❌ Barcode ${barcode} için hata:`, error.message);
    return null;
  }
}

/**
 * Ürün fotoğraflarını OpenFoodFacts'ten çek ve güncelle
 */
async function updateProductImages() {
  try {
    console.log('🚀 Ürün fotoğrafları güncelleme işlemi başlatılıyor...\n');

    // Barcode'u olan ama fotoğrafı olmayan ürünleri çek
    console.log('🔍 Fotoğrafı olmayan ürünler kontrol ediliyor...');
    const productsWithoutImages = await prisma.product.findMany({
      where: {
        barcode: {
          not: null,
        },
        OR: [
          { imageUrls: { equals: [] } },
          { imageUrls: { equals: null } },
        ],
      },
      select: {
        id: true,
        name: true,
        barcode: true,
        imageUrls: true,
      },
      take: 1000, // İlk 1000 ürünü işle (limit ekleyebilirsiniz)
    });

    console.log(`✅ ${productsWithoutImages.length} ürün bulundu (fotoğrafı yok)\n`);

    if (productsWithoutImages.length === 0) {
      console.log('⚠️  Güncellenecek ürün yok. İşlem sonlandırılıyor.');
      return;
    }

    let updated = 0;
    let skipped = 0;
    let errors = [];

    // Rate limiting için delay fonksiyonu
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    console.log('📸 Google Images (SerpAPI) üzerinden fotoğraflar çekiliyor...\n');

    for (let i = 0; i < productsWithoutImages.length; i++) {
      const product = productsWithoutImages[i];
      
      process.stdout.write(
        `\r   İşleniyor: ${i + 1}/${productsWithoutImages.length} | Güncellendi: ${updated} | Atlandı: ${skipped}`
      );

      try {
        // Önce Google Images'tan fotoğraf çek (ürün adı ile)
        let imageUrl = await fetchImageFromGoogleImages(product.name);

        // Eğer bulunamazsa ve barcode varsa, OpenFoodFacts'i dene (fallback)
        if (!imageUrl && product.barcode) {
          imageUrl = await fetchImageFromOpenFoodFacts(product.barcode);
        }

        if (imageUrl) {
          // Mevcut imageUrls array'ini al (boş olabilir)
          const currentImageUrls = Array.isArray(product.imageUrls)
            ? product.imageUrls
            : [];

          // Eğer bu URL zaten yoksa ekle
          if (!currentImageUrls.includes(imageUrl)) {
            const newImageUrls = [imageUrl, ...currentImageUrls]; // Yeni fotoğrafı başa ekle

            // Veritabanını güncelle
            await prisma.product.update({
              where: { id: product.id },
              data: {
                imageUrls: newImageUrls,
              },
            });

            updated++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }

        // Rate limiting: SerpAPI için her istek arasında 1 saniye bekle
        // SerpAPI free plan: ~100 istek/ay, rate limit var
        await delay(1000); // Her istek arasında 1 saniye bekle
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

    console.log('\n\n✅ Fotoğraf güncelleme işlemi tamamlandı!');
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
    const stats = await prisma.product.aggregate({
      _count: {
        id: true,
      },
      where: {
        imageUrls: {
          not: {
            equals: [],
          },
        },
      },
    });
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
    console.log(`   Fotoğraf oranı: ${((totalWithImages / totalProducts) * 100).toFixed(1)}%`);
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
updateProductImages();

