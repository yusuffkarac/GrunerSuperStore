#!/usr/bin/env node

/**
 * Prisma Client Cache Sorunlarını Düzelt
 * 
 * Bu script:
 * 1. Prisma Client cache'ini temizler
 * 2. Prisma Client'ı yeniden generate eder
 * 3. PM2 ile çalışıyorsa server'ı yeniden başlatır
 * 
 * Kullanım:
 *   npm run fix:prisma
 *   veya
 *   node scripts/fix-prisma-client.js
 */

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendDir = join(__dirname, '..');

console.log('🔧 Prisma Client cache sorunlarını düzeltiliyor...\n');

try {
  // 1. Prisma Client cache'ini temizle
  console.log('1️⃣  Prisma Client cache temizleniyor...');
  
  const prismaClientPath = join(backendDir, 'node_modules', '.prisma');
  const prismaClientCachePath = join(backendDir, 'node_modules', '@prisma', 'client');
  
  if (existsSync(prismaClientPath)) {
    console.log(`   📁 ${prismaClientPath} siliniyor...`);
    rmSync(prismaClientPath, { recursive: true, force: true });
  }
  
  if (existsSync(prismaClientCachePath)) {
    // Sadece .prisma klasörünü sil, tüm client'ı değil
    const prismaCacheInClient = join(prismaClientCachePath, '.prisma');
    if (existsSync(prismaCacheInClient)) {
      console.log(`   📁 ${prismaCacheInClient} siliniyor...`);
      rmSync(prismaCacheInClient, { recursive: true, force: true });
    }
  }
  
  console.log('   ✅ Cache temizlendi\n');

  // 2. Prisma Client'ı yeniden generate et
  console.log('2️⃣  Prisma Client yeniden generate ediliyor...');
  execSync('npx prisma generate', {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('   ✅ Prisma Client generate edildi\n');

  // 3. PM2 ile çalışıyorsa server'ı yeniden başlat
  console.log('3️⃣  PM2 process kontrol ediliyor...');
  try {
    const pm2List = execSync('pm2 list', { encoding: 'utf-8' });
    
    // Backend process'ini bul
    if (pm2List.includes('gruner-backend') || pm2List.includes('backend')) {
      console.log('   🔄 PM2 process yeniden başlatılıyor...');
      execSync('pm2 restart gruner-backend || pm2 restart backend', {
        cwd: backendDir,
        stdio: 'inherit'
      });
      console.log('   ✅ PM2 process yeniden başlatıldı\n');
    } else {
      console.log('   ℹ️  PM2 process bulunamadı, manuel olarak server\'ı yeniden başlatın\n');
    }
  } catch (error) {
    // PM2 yoksa veya hata varsa devam et
    console.log('   ℹ️  PM2 bulunamadı veya hata oluştu, devam ediliyor...\n');
  }

  console.log('✅ Tüm işlemler tamamlandı!');
  console.log('\n📝 Not: Eğer hala sorun yaşıyorsanız:');
  console.log('   1. Server\'ı manuel olarak yeniden başlatın');
  console.log('   2. node_modules/@prisma/client klasörünü kontrol edin');
  console.log('   3. npm install çalıştırın');

} catch (error) {
  console.error('❌ Hata oluştu:', error.message);
  process.exit(1);
}

