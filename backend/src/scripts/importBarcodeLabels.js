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

async function importBarcodeLabels() {
  try {
    console.log('🚀 Barkod etiketleri import işlemi başlatılıyor...\n');

    // JSON dosyasını oku
    const jsonPath = path.join(__dirname, '../../frontend/barcodes.json');
    
    if (!fs.existsSync(jsonPath)) {
      console.error('❌ Hata: barcodes.json dosyası bulunamadı!');
      console.error(`   Beklenen yol: ${jsonPath}`);
      process.exit(1);
    }

    console.log('📂 JSON dosyası okunuyor...');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    if (!Array.isArray(jsonData)) {
      console.error('❌ Hata: JSON dosyası bir array olmalı!');
      process.exit(1);
    }

    console.log(`✅ ${jsonData.length} ürün bulundu\n`);

    // Mevcut barkodları kontrol et (duplicate kontrolü için)
    console.log('🔍 Mevcut barkodlar kontrol ediliyor...');
    const existingLabels = await prisma.barcodeLabel.findMany({
      select: { barcode: true },
    });
    const existingBarcodes = new Set(existingLabels.map((label) => label.barcode));
    console.log(`   ${existingBarcodes.size} mevcut barkod bulundu\n`);

    // Verileri hazırla ve filtrele
    console.log('🔄 Veriler hazırlanıyor...');
    const labelsToInsert = [];
    const skipped = [];
    let processed = 0;

    for (const product of jsonData) {
      processed++;

      // Gerekli alanları kontrol et
      if (!product.name || !product.barcode || product.list_price === undefined || product.list_price === null) {
        skipped.push({
          id: product.id,
          reason: 'Eksik alanlar (name, barcode veya list_price)',
        });
        continue;
      }

      // Barkod zaten varsa atla
      if (existingBarcodes.has(product.barcode)) {
        skipped.push({
          id: product.id,
          barcode: product.barcode,
          reason: 'Barkod zaten mevcut',
        });
        continue;
      }

      // Veriyi hazırla
      const labelData = {
        name: String(product.name).trim(),
        price: parseFloat(product.list_price),
        barcode: String(product.barcode).trim(),
        unit: product.uom_name ? String(product.uom_name).trim() : null,
      };

      // Fiyat kontrolü
      if (isNaN(labelData.price) || labelData.price < 0) {
        skipped.push({
          id: product.id,
          barcode: product.barcode,
          reason: `Geçersiz fiyat: ${product.list_price}`,
        });
        continue;
      }

      // Barkod boş mu kontrol et
      if (!labelData.barcode || labelData.barcode.length === 0) {
        skipped.push({
          id: product.id,
          reason: 'Boş barkod',
        });
        continue;
      }

      labelsToInsert.push(labelData);
      existingBarcodes.add(labelData.barcode); // Aynı batch içinde duplicate kontrolü için

      // Progress göster
      if (processed % 100 === 0) {
        process.stdout.write(`\r   İşleniyor: ${processed}/${jsonData.length} (${labelsToInsert.length} eklenecek, ${skipped.length} atlandı)`);
      }
    }

    console.log(`\n\n✅ Veri hazırlama tamamlandı:`);
    console.log(`   📊 Toplam ürün: ${jsonData.length}`);
    console.log(`   ✅ Eklenecek: ${labelsToInsert.length}`);
    console.log(`   ⏭️  Atlanan: ${skipped.length}\n`);

    if (labelsToInsert.length === 0) {
      console.log('⚠️  Eklenecek kayıt yok. İşlem sonlandırılıyor.');
      return;
    }

    // Toplu ekleme (batch processing)
    console.log('💾 Veritabanına kaydediliyor...');
    const batchSize = 100;
    let inserted = 0;
    let errors = [];

    for (let i = 0; i < labelsToInsert.length; i += batchSize) {
      const batch = labelsToInsert.slice(i, i + batchSize);
      
      try {
        await prisma.barcodeLabel.createMany({
          data: batch,
          skipDuplicates: true, // Duplicate varsa atla
        });
        inserted += batch.length;
        process.stdout.write(`\r   Kaydedilen: ${inserted}/${labelsToInsert.length}`);
      } catch (error) {
        console.error(`\n❌ Batch hatası (${i}-${i + batch.length}):`, error.message);
        errors.push({ batch: `${i}-${i + batch.length}`, error: error.message });
      }
    }

    console.log('\n\n✅ Import işlemi tamamlandı!');
    console.log(`   ✅ Başarıyla eklendi: ${inserted}`);
    console.log(`   ⏭️  Atlandı: ${skipped.length}`);

    if (errors.length > 0) {
      console.log(`   ❌ Hata sayısı: ${errors.length}`);
    }

    // Atlanan kayıtları göster (ilk 10)
    if (skipped.length > 0) {
      console.log('\n📋 İlk 10 atlanan kayıt:');
      skipped.slice(0, 10).forEach((item, index) => {
        console.log(`   ${index + 1}. ID: ${item.id}, Barkod: ${item.barcode || 'N/A'}, Sebep: ${item.reason}`);
      });
      if (skipped.length > 10) {
        console.log(`   ... ve ${skipped.length - 10} kayıt daha`);
      }
    }

  } catch (error) {
    console.error('\n❌ Kritik hata:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
    console.log('\n👋 Veritabanı bağlantısı kapatıldı.');
  }
}

// Scripti çalıştır
importBarcodeLabels();

