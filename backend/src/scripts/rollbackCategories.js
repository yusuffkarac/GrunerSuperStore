import dotenv from 'dotenv';
import prisma from '../config/prisma.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// .env dosyasını yükle
dotenv.config();

// ES modules için __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log klasörü
const logDir = path.join(__dirname, '../../logs');

/**
 * Kategori analizi değişikliklerini geri al
 */
async function rollbackCategories(logFileName) {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Kategori değişikliklerini geri alma işlemi başlatılıyor...\n');

    // Log dosyasını bul
    let logFile;
    if (logFileName) {
      // Tam dosya adı verilmişse
      if (path.isAbsolute(logFileName)) {
        logFile = logFileName;
      } else {
        logFile = path.join(logDir, logFileName);
      }
    } else {
      // En son log dosyasını bul
      const files = fs.readdirSync(logDir)
        .filter(f => f.startsWith('category-analysis-') && f.endsWith('.json'))
        .sort()
        .reverse();
      
      if (files.length === 0) {
        console.log('❌ Log dosyası bulunamadı.');
        console.log(`   Log klasörü: ${logDir}`);
        return;
      }
      
      logFile = path.join(logDir, files[0]);
      console.log(`📝 En son log dosyası kullanılıyor: ${files[0]}\n`);
    }

    if (!fs.existsSync(logFile)) {
      console.log(`❌ Log dosyası bulunamadı: ${logFile}`);
      return;
    }

    // Log dosyasını oku
    console.log(`📂 Log dosyası okunuyor: ${path.basename(logFile)}\n`);
    const logData = JSON.parse(fs.readFileSync(logFile, 'utf8'));

    if (!logData.changes || logData.changes.length === 0) {
      console.log('ℹ️  Geri alınacak değişiklik bulunamadı.');
      return;
    }

    console.log(`📊 ${logData.changes.length} ürün için değişiklik geri alınacak.\n`);
    console.log(`   Orijinal çalıştırma tarihi: ${logData.executedAt}\n`);

    let successCount = 0;
    let failedCount = 0;
    const results = [];

    // Her değişikliği geri al
    for (let i = 0; i < logData.changes.length; i++) {
      const change = logData.changes[i];
      
      console.log(`[${i + 1}/${logData.changes.length}] 🔄 Geri alınıyor: "${change.productName}"`);

      try {
        // Ürünün mevcut durumunu kontrol et
        const product = await prisma.product.findUnique({
          where: { id: change.productId },
          select: {
            id: true,
            name: true,
            categoryId: true,
          },
        });

        if (!product) {
          console.log(`   ⚠️  Ürün bulunamadı (silinmiş olabilir).`);
          failedCount++;
          results.push({
            productId: change.productId,
            productName: change.productName,
            status: 'failed',
            reason: 'Ürün bulunamadı',
          });
          continue;
        }

        // Eğer ürün zaten eski kategorideyse, atla
        if (product.categoryId === change.oldCategoryId) {
          console.log(`   ℹ️  Ürün zaten eski kategorisinde (${change.oldCategoryName}). Atlanıyor.`);
          successCount++;
          results.push({
            productId: change.productId,
            productName: change.productName,
            status: 'skipped',
            reason: 'Zaten eski kategorisinde',
          });
          continue;
        }

        // Eski kategori hala var mı kontrol et
        const oldCategory = await prisma.category.findUnique({
          where: { id: change.oldCategoryId },
        });

        if (!oldCategory) {
          console.log(`   ⚠️  Eski kategori bulunamadı: ${change.oldCategoryName} (ID: ${change.oldCategoryId})`);
          failedCount++;
          results.push({
            productId: change.productId,
            productName: change.productName,
            status: 'failed',
            reason: `Eski kategori bulunamadı: ${change.oldCategoryName}`,
          });
          continue;
        }

        // Kategoriyi geri al
        await prisma.product.update({
          where: { id: change.productId },
          data: {
            categoryId: change.oldCategoryId,
          },
        });

        console.log(`   ✅ Kategori geri alındı: "${change.oldCategoryName}" (ID: ${change.oldCategoryId})\n`);
        successCount++;
        results.push({
          productId: change.productId,
          productName: change.productName,
          status: 'success',
          oldCategory: change.oldCategoryName,
          newCategory: change.newCategoryName,
        });
      } catch (error) {
        console.error(`   ❌ Hata: ${error.message}\n`);
        failedCount++;
        results.push({
          productId: change.productId,
          productName: change.productName,
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
    console.log(`📦 Toplam: ${logData.changes.length}\n`);

    if (results.length > 0) {
      console.log('📋 Detaylı Sonuçlar:');
      results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.productName}`);
        console.log(`   Durum: ${result.status === 'success' ? '✅ Başarılı' : result.status === 'skipped' ? '⏭️  Atlanıldı' : '❌ Başarısız'}`);
        if (result.status === 'success') {
          console.log(`   Eski Kategori: ${result.newCategory}`);
          console.log(`   Yeni Kategori: ${result.oldCategory}`);
        } else {
          console.log(`   Sebep: ${result.reason || result.error}`);
        }
      });
    }

    console.log('\n✅ Rollback işlemi tamamlandı!');
    
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
    console.log(`📊 İşlenen Ürün Sayısı: ${logData.changes.length}`);
    console.log(`⚡ Ortalama Süre/Ürün: ${(duration / logData.changes.length).toFixed(2)} saniye`);
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
const logFileName = process.argv[2];

if (logFileName && (logFileName === '--help' || logFileName === '-h')) {
  console.log(`
Kategori Analizi Rollback Script'i

Kullanım:
  npm run rollback-categories [log-dosya-adi]

Örnekler:
  npm run rollback-categories                                    # En son log dosyasını kullanır
  npm run rollback-categories category-analysis-2024-01-15.json  # Belirli log dosyasını kullanır

Log dosyaları: backend/logs/ klasöründe saklanır
  `);
  process.exit(0);
}

rollbackCategories(logFileName)
  .then(() => {
    console.log('\n🎉 Rollback script başarıyla tamamlandı.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Rollback script hatası:', error);
    process.exit(1);
  });

