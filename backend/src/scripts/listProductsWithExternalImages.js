import dotenv from 'dotenv';
import prisma from '../config/prisma.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// .env dosyasını yükle
dotenv.config();

// ES modules için __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Çıktı dosyası
const outputDir = path.join(__dirname, '../../tracking');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
const outputFile = path.join(outputDir, 'products-with-external-images.json');

/**
 * URL'nin harici link olup olmadığını kontrol et
 * @param {string} url - Kontrol edilecek URL
 * @returns {boolean} Harici link ise true
 */
function isExternalUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Boş string kontrolü
  if (url.trim().length === 0) {
    return false;
  }

  // Yerel dosya yolu kontrolü (/uploads/products/ ile başlıyorsa yerel)
  if (url.startsWith('/uploads/products/')) {
    return false;
  }

  // Harici URL kontrolü (http:// veya https:// ile başlıyorsa harici)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return true;
  }

  // Diğer durumlar yerel kabul edilir
  return false;
}

/**
 * Ürünlerin fotoğraflarını kontrol et ve harici link olanları listele
 */
async function listProductsWithExternalImages() {
  try {
    console.log('🔍 Harici link olan fotoğrafları kontrol ediliyor...\n');

    // Tüm ürünleri çek
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        barcode: true,
        imageUrls: true,
        categoryId: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`📦 Toplam ürün sayısı: ${allProducts.length}\n`);

    const productsWithExternalImages = [];
    let totalExternalImages = 0;

    // Her ürünü kontrol et
    for (const product of allProducts) {
      // imageUrls boş veya null ise atla
      if (!product.imageUrls || !Array.isArray(product.imageUrls)) {
        continue;
      }

      // Harici link olan fotoğrafları bul
      const externalUrls = product.imageUrls.filter((url) => isExternalUrl(url));

      if (externalUrls.length > 0) {
        productsWithExternalImages.push({
          id: product.id,
          name: product.name,
          slug: product.slug,
          barcode: product.barcode,
          categoryName: product.category?.name || 'Bilinmiyor',
          totalImages: product.imageUrls.length,
          externalImageCount: externalUrls.length,
          externalImageUrls: externalUrls,
          localImageUrls: product.imageUrls.filter((url) => !isExternalUrl(url)),
        });

        totalExternalImages += externalUrls.length;
      }
    }

    // Sonuçları konsola yazdır
    console.log('📊 Sonuçlar:\n');
    console.log(`   ✅ Harici link olan ürün sayısı: ${productsWithExternalImages.length}`);
    console.log(`   📸 Toplam harici fotoğraf sayısı: ${totalExternalImages}`);
    console.log(`   📁 Çıktı dosyası: ${outputFile}\n`);

    // İlk 10 ürünü göster
    if (productsWithExternalImages.length > 0) {
      console.log('📋 İlk 10 ürün örneği:\n');
      productsWithExternalImages.slice(0, 10).forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   Barcode: ${product.barcode || 'N/A'}`);
        console.log(`   Kategori: ${product.categoryName}`);
        console.log(`   Toplam fotoğraf: ${product.totalImages}`);
        console.log(`   Harici fotoğraf: ${product.externalImageCount}`);
        console.log(`   Harici linkler:`);
        product.externalImageUrls.forEach((url) => {
          console.log(`     - ${url}`);
        });
        console.log('');
      });

      if (productsWithExternalImages.length > 10) {
        console.log(`   ... ve ${productsWithExternalImages.length - 10} ürün daha\n`);
      }
    } else {
      console.log('✅ Harici link olan fotoğraf bulunamadı! Tüm fotoğraflar yerel olarak saklanıyor.\n');
    }

    // JSON dosyasına kaydet
    const outputData = {
      generatedAt: new Date().toISOString(),
      totalProducts: allProducts.length,
      productsWithExternalImages: productsWithExternalImages.length,
      totalExternalImages: totalExternalImages,
      products: productsWithExternalImages,
    };

    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2), 'utf8');
    console.log(`✅ Sonuçlar kaydedildi: ${outputFile}`);

    // İstatistikler
    console.log('\n📊 Detaylı İstatistikler:');
    console.log(`   Toplam ürün: ${allProducts.length}`);
    console.log(`   Harici link olan ürün: ${productsWithExternalImages.length}`);
    console.log(`   Yerel fotoğrafı olan ürün: ${allProducts.length - productsWithExternalImages.length}`);
    console.log(`   Harici fotoğraf oranı: ${((productsWithExternalImages.length / allProducts.length) * 100).toFixed(2)}%`);
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
listProductsWithExternalImages();

