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

/**
 * Vergi oranını çıkar (single_tax_id alanından)
 * Örnek: [118, "19% Umsatzsteuer"] -> 19.00
 * Örnek: [125, "7% Vorsteuer"] -> 7.00
 */
function extractTaxRate(singleTaxId) {
  if (!singleTaxId || !Array.isArray(singleTaxId) || singleTaxId.length < 2) {
    return null;
  }

  const taxString = singleTaxId[1]; // İkinci eleman vergi yüzdesini içerir
  if (!taxString || typeof taxString !== 'string') {
    return null;
  }

  // "%" işaretinden önceki sayıyı bul
  const match = taxString.match(/(\d+(?:\.\d+)?)%/);
  if (match && match[1]) {
    const rate = parseFloat(match[1]);
    return isNaN(rate) ? null : rate;
  }

  return null;
}

/**
 * Barcodes.json'dan vergi oranlarını oku ve products tablosunu güncelle
 * Önce tüm vergi oranlarını siler, sonra barcodes.json'dan yeniden ekler
 */
async function updateTaxRatesFromBarcodes() {
  try {
    // ÖNCE: Tüm vergi oranlarını sil
    console.log('🗑️  Tüm vergi oranları siliniyor...');
    const deleteResult = await prisma.product.updateMany({
      data: {
        taxRate: null,
      },
    });
    console.log(`✅ ${deleteResult.count} ürünün vergi oranı silindi\n`);

    console.log('📖 barcodes.json dosyası okunuyor...');
    
    // barcodes.json dosyasını oku
    const barcodesPath = path.join(__dirname, '../../frontend/barcodes.json');
    if (!fs.existsSync(barcodesPath)) {
      throw new Error(`barcodes.json dosyası bulunamadı: ${barcodesPath}`);
    }

    const barcodesData = JSON.parse(fs.readFileSync(barcodesPath, 'utf-8'));
    console.log(`✅ ${barcodesData.length} ürün bulundu`);

    // Barcode -> TaxRate mapping oluştur
    const barcodeTaxMap = new Map();
    let validTaxCount = 0;

    for (const item of barcodesData) {
      if (item.barcode && item.single_tax_id) {
        const taxRate = extractTaxRate(item.single_tax_id);
        if (taxRate !== null) {
          barcodeTaxMap.set(item.barcode.trim(), taxRate);
          validTaxCount++;
        }
      }
    }

    console.log(`✅ ${validTaxCount} ürün için geçerli vergi oranı bulundu`);

    // Veritabanındaki tüm ürünleri al
    console.log('📦 Veritabanından ürünler çekiliyor...');
    const products = await prisma.product.findMany({
      where: {
        barcode: {
          not: null,
        },
      },
      select: {
        id: true,
        barcode: true,
        name: true,
        taxRate: true,
      },
    });

    console.log(`✅ ${products.length} ürün barcode ile bulundu`);

    // Güncelleme işlemleri
    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;
    const errors = [];

    for (const product of products) {
      if (!product.barcode) {
        skippedCount++;
        continue;
      }

      const taxRate = barcodeTaxMap.get(product.barcode.trim());

      if (taxRate === undefined) {
        notFoundCount++;
        continue;
      }

      try {
        await prisma.product.update({
          where: { id: product.id },
          data: { taxRate: taxRate },
        });
        updatedCount++;
        
        if (updatedCount % 100 === 0) {
          console.log(`  ⏳ ${updatedCount} ürün güncellendi...`);
        }
      } catch (error) {
        errors.push({
          productId: product.id,
          productName: product.name,
          barcode: product.barcode,
          error: error.message,
        });
      }
    }

    // Sonuçları göster
    console.log('\n📊 Güncelleme Sonuçları:');
    console.log(`  ✅ Güncellenen: ${updatedCount}`);
    console.log(`  ⏭️  Atlanan: ${skippedCount}`);
    console.log(`  ❌ Vergi oranı bulunamayan: ${notFoundCount}`);

    if (errors.length > 0) {
      console.log(`\n⚠️  ${errors.length} hata oluştu:`);
      errors.slice(0, 10).forEach((err) => {
        console.log(`  - ${err.productName} (${err.barcode}): ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`  ... ve ${errors.length - 10} hata daha`);
      }
    }

    console.log('\n✅ Vergi oranı güncelleme işlemi tamamlandı!');
  } catch (error) {
    console.error('❌ Hata:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script çalıştır
updateTaxRatesFromBarcodes()
  .then(() => {
    console.log('✨ Script başarıyla tamamlandı');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script hatası:', error);
    process.exit(1);
  });

