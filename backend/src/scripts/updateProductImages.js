import dotenv from 'dotenv';
import prisma from '../config/prisma.js';
import { fileURLToPath } from 'url';
import path from 'path';
import https from 'https';
import http from 'http';
import { getJson } from 'serpapi';
import fs from 'fs';

// .env dosyasını yükle
dotenv.config();

// ES modules için __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads klasörünü oluştur
const uploadsDir = path.join(__dirname, '../../uploads');
const productsUploadDir = path.join(uploadsDir, 'products');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(productsUploadDir)) {
  fs.mkdirSync(productsUploadDir, { recursive: true });
}

// Takip dosyaları
const trackingDir = path.join(__dirname, '../../tracking');
if (!fs.existsSync(trackingDir)) {
  fs.mkdirSync(trackingDir, { recursive: true });
}

const SUCCESS_FILE = path.join(trackingDir, 'image-success.json');
const FAILED_FILE = path.join(trackingDir, 'image-failed.json');
const PENDING_FILE = path.join(trackingDir, 'image-pending.json');

/**
 * Takip dosyasını yükle
 */
function loadTrackingFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn(`⚠️  Takip dosyası okunamadı: ${filePath}`);
  }
  return [];
}

/**
 * Takip dosyasına ekle
 */
function appendToTrackingFile(filePath, entry) {
  try {
    const existing = loadTrackingFile(filePath);
    // Duplicate kontrolü (barcode'a göre)
    const exists = existing.find(
      (item) => item.barcode === entry.barcode && item.productId === entry.productId
    );
    if (!exists) {
      existing.push({
        ...entry,
        timestamp: new Date().toISOString(),
      });
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
    }
  } catch (error) {
    console.error(`❌ Takip dosyası yazılamadı: ${filePath}`, error.message);
  }
}

/**
 * Takip dosyasından kaldır (pending'den success/failed'e geçince)
 */
function removeFromTrackingFile(filePath, productId) {
  try {
    const existing = loadTrackingFile(filePath);
    const filtered = existing.filter((item) => item.productId !== productId);
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf8');
  } catch (error) {
    console.error(`❌ Takip dosyası güncellenemedi: ${filePath}`, error.message);
  }
}

/**
 * URL'den fotoğraf indir ve yerel sunucuya kaydet
 * @param {string} imageUrl - İndirilecek fotoğraf URL'i
 * @returns {Promise<string|null>} Yerel URL veya null
 */
async function downloadAndSaveImage(imageUrl) {
  if (!imageUrl || imageUrl.trim().length === 0) {
    return null;
  }

  try {
    // URL'den dosya uzantısını belirle
    const urlObj = new URL(imageUrl);
    const pathname = urlObj.pathname;
    let ext = path.extname(pathname).toLowerCase();
    
    // Eğer uzantı yoksa veya geçersizse, default olarak jpg kullan
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!ext || !validExtensions.includes(ext)) {
      ext = '.jpg';
    }

    // Benzersiz dosya adı oluştur
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}${ext}`;
    const filePath = path.join(productsUploadDir, filename);

    // Fotoğrafı indir
    return new Promise((resolve, reject) => {
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const req = protocol.get(imageUrl, (res) => {
        // Content-Type kontrolü
        const contentType = res.headers['content-type'];
        if (!contentType || !contentType.startsWith('image/')) {
          req.destroy();
          reject(new Error('Geçersiz content-type'));
          return;
        }

        // Dosya boyutu kontrolü (max 10MB)
        const contentLength = parseInt(res.headers['content-length'] || '0');
        if (contentLength > 10 * 1024 * 1024) {
          req.destroy();
          reject(new Error('Dosya çok büyük (max 10MB)'));
          return;
        }

        const fileStream = fs.createWriteStream(filePath);
        let downloadedSize = 0;

        res.on('data', (chunk) => {
          downloadedSize += chunk.length;
          // İlerleme sırasında boyut kontrolü
          if (downloadedSize > 10 * 1024 * 1024) {
            fileStream.destroy();
            fs.unlinkSync(filePath);
            req.destroy();
            reject(new Error('Dosya çok büyük (max 10MB)'));
          }
        });

        res.on('end', () => {
          fileStream.end();
          // Yerel URL'yi döndür
          const localUrl = `/uploads/products/${filename}`;
          resolve(localUrl);
        });

        res.on('error', (error) => {
          fileStream.destroy();
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          reject(error);
        });

        fileStream.on('error', (error) => {
          req.destroy();
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          reject(error);
        });

        res.pipe(fileStream);
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('İndirme zaman aşımı'));
      });
    });
  } catch (error) {
    console.error(`  ❌ Fotoğraf indirme hatası: ${error.message}`);
    return null;
  }
}

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

  const apiKey = process.env.SERPAPI_KEY || 'da4f06ad9c084ae608e23f553ab8c4bddf590e96010425997c10471d1c56419f';

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

    // Takip dosyalarını yükle
    const alreadyProcessed = loadTrackingFile(SUCCESS_FILE).map((item) => item.productId);
    const alreadyFailed = loadTrackingFile(FAILED_FILE).map((item) => item.productId);
    
    // Henüz işlenmemiş ürünleri filtrele
    const pendingProducts = productsWithoutImages.filter(
      (product) => !alreadyProcessed.includes(product.id) && !alreadyFailed.includes(product.id)
    );

    // Pending listesini güncelle
    const pendingEntries = pendingProducts.map((product) => ({
      productId: product.id,
      name: product.name,
      barcode: product.barcode,
      timestamp: new Date().toISOString(),
    }));
    fs.writeFileSync(PENDING_FILE, JSON.stringify(pendingEntries, null, 2), 'utf8');

    console.log(`📋 İşlenecek ürün sayısı: ${pendingProducts.length}`);
    console.log(`   ✅ Zaten başarılı: ${alreadyProcessed.length}`);
    console.log(`   ❌ Zaten başarısız: ${alreadyFailed.length}`);
    console.log(`   ⏳ Bekleyen: ${pendingProducts.length}\n`);

    if (pendingProducts.length === 0) {
      console.log('⚠️  İşlenecek yeni ürün yok. İşlem sonlandırılıyor.');
      return;
    }

    let updated = 0;
    let skipped = 0;
    let errors = [];

    // Rate limiting için delay fonksiyonu
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    console.log('📸 Google Images (SerpAPI) üzerinden fotoğraflar çekiliyor...\n');

    // Paralel işleme için batch size
    const batchSize = 10; // Aynı anda 5 ürün işle
    const delayBetweenBatches = 1000; // Batch'ler arasında 2 saniye bekle (SerpAPI rate limit için)

    for (let batchStart = 0; batchStart < pendingProducts.length; batchStart += batchSize) {
      const batch = pendingProducts.slice(batchStart, batchStart + batchSize);
      const batchNumber = Math.floor(batchStart / batchSize) + 1;
      const totalBatches = Math.ceil(pendingProducts.length / batchSize);

      console.log(`\n📦 Batch ${batchNumber}/${totalBatches} işleniyor (${batch.length} ürün)...`);

      // Batch içindeki ürünleri paralel işle
      const batchPromises = batch.map(async (product, index) => {
        try {
          // Önce Google Images'tan fotoğraf çek (ürün adı ile)
          let imageUrl = await fetchImageFromGoogleImages(product.name);
          let source = 'Google Images';

          // Eğer bulunamazsa ve barcode varsa, OpenFoodFacts'i dene (fallback)
          if (!imageUrl && product.barcode) {
            imageUrl = await fetchImageFromOpenFoodFacts(product.barcode);
            source = 'OpenFoodFacts';
          }

          if (imageUrl) {
            // Fotoğrafı indir ve yerel sunucuya kaydet
            const localImageUrl = await downloadAndSaveImage(imageUrl);
            
            if (!localImageUrl) {
              return {
                success: false,
                product,
                reason: 'İndirilemedi',
              };
            }

            // Mevcut imageUrls array'ini al (boş olabilir)
            const currentImageUrls = Array.isArray(product.imageUrls)
              ? product.imageUrls
              : [];

            // Eğer bu URL zaten yoksa ekle
            if (!currentImageUrls.includes(localImageUrl)) {
              const newImageUrls = [localImageUrl, ...currentImageUrls];

              // Veritabanını güncelle
              await prisma.product.update({
                where: { id: product.id },
                data: {
                  imageUrls: newImageUrls,
                },
              });

              return {
                success: true,
                product,
                source,
                localImageUrl,
              };
            } else {
              return {
                success: false,
                product,
                reason: 'Zaten mevcut',
              };
            }
          } else {
            return {
              success: false,
              product,
              reason: 'Fotoğraf bulunamadı',
            };
          }
        } catch (error) {
          return {
            success: false,
            product,
            error: error.message,
          };
        }
      });

      // Batch sonuçlarını bekle
      const batchResults = await Promise.all(batchPromises);

      // Sonuçları işle
      for (const result of batchResults) {
        if (result.success) {
          updated++;
          // Başarılı dosyasına ekle
          appendToTrackingFile(SUCCESS_FILE, {
            productId: result.product.id,
            name: result.product.name,
            barcode: result.product.barcode,
            source: result.source,
            imageUrl: result.localImageUrl,
          });
          // Pending'den kaldır
          removeFromTrackingFile(PENDING_FILE, result.product.id);
          
          console.log(
            `   ✅ İndirildi: ${result.product.name} (Barcode: ${result.product.barcode || 'N/A'}) - ${result.source}`
          );
        } else {
          skipped++;
          // Başarısız dosyasına ekle
          appendToTrackingFile(FAILED_FILE, {
            productId: result.product.id,
            name: result.product.name,
            barcode: result.product.barcode,
            reason: result.reason || result.error || 'Bilinmeyen hata',
            error: result.error || null,
          });
          // Pending'den kaldır
          removeFromTrackingFile(PENDING_FILE, result.product.id);
          
          if (result.error) {
            errors.push({
              id: result.product.id,
              name: result.product.name,
              barcode: result.product.barcode,
              error: result.error,
            });
          }
        }
      }

      // Progress göster
      const processed = Math.min(batchStart + batchSize, pendingProducts.length);
      console.log(
        `\n   📊 İlerleme: ${processed}/${pendingProducts.length} | Güncellendi: ${updated} | Atlandı: ${skipped}`
      );

      // Son batch değilse bekle (rate limiting)
      if (batchStart + batchSize < pendingProducts.length) {
        await delay(delayBetweenBatches);
      }
    }

    console.log('\n\n✅ Fotoğraf güncelleme işlemi tamamlandı!');
    console.log(`   ✅ Güncellendi: ${updated}`);
    console.log(`   ⏭️  Atlandı: ${skipped}`);

    // Takip dosyaları özeti
    const successCount = loadTrackingFile(SUCCESS_FILE).length;
    const failedCount = loadTrackingFile(FAILED_FILE).length;
    const pendingCount = loadTrackingFile(PENDING_FILE).length;

    console.log('\n📁 Takip Dosyaları:');
    console.log(`   ✅ Başarılı: ${SUCCESS_FILE} (${successCount} kayıt)`);
    console.log(`   ❌ Başarısız: ${FAILED_FILE} (${failedCount} kayıt)`);
    console.log(`   ⏳ Bekleyen: ${PENDING_FILE} (${pendingCount} kayıt)`);

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

