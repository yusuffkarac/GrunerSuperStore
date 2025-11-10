#!/usr/bin/env node
/**
 * MHD Expiry Check Cron Script
 * Bu script her gün çalıştırılmalı (örneğin saat 23:00'te)
 * MHD'si bugün biten ve işlem yapılmış ürünleri kontrol eder ve adminlere mail gönderir
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env dosyasını yükle
dotenv.config({ path: join(__dirname, '../.env') });

// Prisma ve servisleri import et
import prisma from './config/prisma.js';
import queueService from './services/queue.service.js';
import * as expiryService from './services/expiry.service.js';

// Queue service'i başlat
queueService.initialize();

async function main() {
  console.log('🚀 MHD Expiry Check Cron Script başlatılıyor...');
  console.log(`📅 Tarih: ${new Date().toLocaleString('de-DE')}`);

  try {
    const result = await expiryService.checkExpiredProductsAndNotifyAdmins();
    
    if (result.success) {
      console.log(`✅ Başarılı: ${result.message}`);
      console.log(`📦 İşlem yapılan ürün sayısı: ${result.count}`);
      if (result.emailResults) {
        const successCount = result.emailResults.filter(r => r.success).length;
        console.log(`📧 ${successCount}/${result.emailResults.length} admin'e mail gönderildi`);
      }
      process.exit(0);
    } else {
      console.error(`❌ Hata: ${result.message}`);
      if (result.error) {
        console.error(`   Detay: ${result.error}`);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error);
    process.exit(1);
  } finally {
    // Prisma bağlantısını kapat
    await prisma.$disconnect();
  }
}

main();

