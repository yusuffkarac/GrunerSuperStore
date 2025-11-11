#!/usr/bin/env node
/**
 * Veritabanı Restore Scripti
 * 
 * GitHub'dan çekilen dump dosyasını sunucudaki veritabanına yükler.
 * 
 * Kullanım:
 *   npm run db:restore [dump-file-name] [tenant-name]
 *   veya
 *   node backend/scripts/restoreDatabase.js [dump-file-name] [tenant-name]
 * 
 * Eğer dosya adı belirtilmezse, en son dump dosyası kullanılır.
 * Eğer tenant-name belirtilirse, .env.{tenant-name} dosyası kullanılır.
 * 
 * Örnek:
 *   node scripts/restoreDatabase.js dump_gruner_superstore_2025-11-11_164132.sql gruner
 */

import { spawn } from 'child_process';
import { readdirSync, statSync, createReadStream, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import readline from 'readline';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tenant adını al (ikinci parametre)
const tenantName = process.argv[3];

// Önce varsayılan .env dosyalarını yükle
dotenv.config({ path: join(__dirname, '../.env') });
dotenv.config({ path: join(__dirname, '../../.env') });

// Eğer tenant-name belirtilmişse, .env.{tenant-name} dosyasını yükle (override eder)
if (tenantName) {
  const tenantEnvPath = join(__dirname, `../.env.${tenantName}`);
  if (existsSync(tenantEnvPath)) {
    console.log(`📋 Tenant .env dosyası bulundu: .env.${tenantName}`);
    // Önce mevcut DB_NAME'i logla
    console.log(`   Önceki DB_NAME: ${process.env.DB_NAME || 'not set'}`);
    dotenv.config({ path: tenantEnvPath });
    // Sonra yeni DB_NAME'i logla
    console.log(`   Yeni DB_NAME: ${process.env.DB_NAME || 'not set'}`);
  } else {
    console.warn(`⚠️  Tenant .env dosyası bulunamadı: .env.${tenantName}`);
    console.warn(`   Varsayılan .env dosyası kullanılacak.`);
  }
}

// Veritabanı bağlantı bilgileri
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'gruner_superstore';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD; // Opsiyonel - şifre yoksa trust/peer auth kullanılır

// Debug: Final değerleri göster
if (tenantName) {
  console.log(`\n🔍 Final Database Config:`);
  console.log(`   DB_NAME: ${DB_NAME}`);
  console.log(`   DB_HOST: ${DB_HOST}`);
  console.log(`   DB_USER: ${DB_USER}`);
}

// Dump klasörü
const DUMP_DIR = join(__dirname, '../database-dumps');

// Kullanıcıdan onay almak için
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// En son dump dosyasını bul
function findLatestDump() {
  try {
    const files = readdirSync(DUMP_DIR)
      .filter(file => file.startsWith('dump_') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: join(DUMP_DIR, file),
        time: statSync(join(DUMP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    return files.length > 0 ? files[0] : null;
  } catch (error) {
    return null;
  }
}

// Veritabanını temizle (tüm tabloları CASCADE ile drop et)
function cleanDatabase(env) {
  return new Promise((resolve, reject) => {
    // En basit ve güvenli yöntem: public schema'yı CASCADE ile drop edip yeniden oluştur
    const cleanSQL = 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;';
    
    const psql = spawn('psql', [
      '-h', DB_HOST,
      '-p', String(DB_PORT),
      '-U', DB_USER,
      '-d', DB_NAME,
      '-c', cleanSQL,
      '--quiet'
    ], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stderr = '';
    
    psql.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    psql.on('close', (code) => {
      if (code !== 0 && stderr && !stderr.includes('WARNING') && !stderr.includes('NOTICE')) {
        // Eğer veritabanı zaten boşsa veya schema yoksa, bu normal
        if (!stderr.includes('does not exist') && !stderr.includes('FATAL')) {
          console.warn('⚠️  Temizleme sırasında uyarı:', stderr);
        }
      }
      resolve();
    });
    
    psql.on('error', (error) => {
      // Eğer veritabanı bağlantı hatası varsa, devam et (belki veritabanı yok)
      if (error.message.includes('does not exist') || error.message.includes('FATAL')) {
        resolve();
      } else {
        reject(error);
      }
    });
  });
}

async function restoreDatabase(dumpFile) {
  try {
    console.log('🔄 Veritabanı restore işlemi başlatılıyor...');
    console.log(`   Database: ${DB_NAME}`);
    console.log(`   Host: ${DB_HOST}:${DB_PORT}`);
    console.log(`   User: ${DB_USER}`);
    if (DB_PASSWORD) {
      console.log(`   Authentication: Password`);
    } else {
      console.log(`   Authentication: Trust/Peer (şifre yok)`);
    }
    console.log(`   Dump File: ${dumpFile}`);
    
    // Dosyanın varlığını kontrol et
    const fs = await import('fs');
    if (!fs.existsSync(dumpFile)) {
      console.error(`\n❌ HATA: Dump dosyası bulunamadı: ${dumpFile}`);
      process.exit(1);
    }
    
    // Dosya boyutunu göster
    const stats = fs.statSync(dumpFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`   Dosya Boyutu: ${fileSizeMB} MB`);
    
    // UYARI: Bu işlem mevcut veritabanını SİLECEK!
    console.log('\n⚠️  UYARI: Bu işlem mevcut veritabanındaki TÜM verileri silecek!');
    const confirmation = await askQuestion('   Devam etmek istediğinize emin misiniz? (yes/no): ');
    
    if (confirmation.toLowerCase() !== 'yes' && confirmation.toLowerCase() !== 'y') {
      console.log('\n❌ İşlem iptal edildi.');
      process.exit(0);
    }
    
    // Environment variables - şifre varsa PGPASSWORD set et
    const env = {
      ...process.env
    };
    if (DB_PASSWORD) {
      env.PGPASSWORD = DB_PASSWORD;
    }
    
    // Önce veritabanını temizle (CASCADE ile tüm bağımlılıkları sil)
    console.log('\n🧹 Mevcut veritabanı temizleniyor...');
    await cleanDatabase(env);
    
    // psql komutu ile restore et
    // --single-transaction: Tüm işlemi tek transaction'da yapar (hata durumunda rollback)
    // --quiet: Gereksiz çıktıları bastırır
    console.log('\n⏳ Veritabanı restore ediliyor...');
    console.log('   (Bu işlem büyük dosyalar için birkaç dakika sürebilir)');
    
    return new Promise((resolve, reject) => {
      // psql process'i başlat
      const psql = spawn('psql', [
        '-h', DB_HOST,
        '-p', String(DB_PORT),
        '-U', DB_USER,
        '-d', DB_NAME,
        '--single-transaction',
        '--quiet'
      ], {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Dump dosyasını stdin'e pipe et
      const fileStream = createReadStream(dumpFile);
      fileStream.pipe(psql.stdin);
      
      let stdout = '';
      let stderr = '';
      
      // Progress göstergesi için timer
      const progressInterval = setInterval(() => {
        process.stdout.write('.');
      }, 1000);
      
      psql.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      psql.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      psql.on('close', (code) => {
        clearInterval(progressInterval);
        console.log(''); // Yeni satır
        
        if (code !== 0) {
          // Hata durumu
          if (stderr && !stderr.includes('WARNING') && !stderr.includes('NOTICE')) {
            console.error('❌ HATA: Restore işlemi başarısız oldu!');
            console.error('   Hata:', stderr);
            reject(new Error(`psql exited with code ${code}: ${stderr}`));
            return;
          }
        }
        
        // Uyarıları göster (ama hata olarak sayma)
        if (stderr && !stderr.includes('WARNING') && !stderr.includes('NOTICE')) {
          console.warn('⚠️  Uyarı:', stderr);
        }
        
        if (stdout) {
          console.log(stdout);
        }
        
        console.log('\n✅ Veritabanı başarıyla restore edildi!');
        console.log(`   Database: ${DB_NAME}`);
        resolve();
      });
      
      psql.on('error', (error) => {
        clearInterval(progressInterval);
        console.log(''); // Yeni satır
        reject(error);
      });
      
      fileStream.on('error', (error) => {
        clearInterval(progressInterval);
        console.log(''); // Yeni satır
        psql.kill();
        reject(error);
      });
    });
    
  } catch (error) {
    console.error('\n❌ HATA: Restore işlemi sırasında bir hata oluştu!');
    console.error('   Hata:', error.message);
    
    if (error.message.includes('psql: command not found')) {
      console.error('\n💡 Çözüm: PostgreSQL client tools yüklü değil.');
      console.error('   macOS: brew install postgresql');
      console.error('   Ubuntu: sudo apt-get install postgresql-client');
      console.error('   Windows: https://www.postgresql.org/download/windows/');
    }
    
    if (error.message.includes('does not exist')) {
      console.error('\n💡 Çözüm: Veritabanı mevcut değil. Önce oluşturun:');
      console.error(`   createdb -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} ${DB_NAME}`);
    }
    
    process.exit(1);
  }
}

// Ana fonksiyon
async function main() {
  const dumpFileName = process.argv[2];
  const tenantName = process.argv[3];
  let dumpFile;
  
  // Tenant bilgisini göster
  if (tenantName) {
    console.log(`\n🏢 Tenant: ${tenantName}`);
    console.log(`   .env dosyası: .env.${tenantName}`);
  }
  
  if (dumpFileName) {
    // Belirtilen dosya adı
    if (dumpFileName.startsWith('/') || dumpFileName.startsWith('.')) {
      // Tam yol
      dumpFile = dumpFileName;
    } else {
      // Sadece dosya adı
      dumpFile = join(DUMP_DIR, dumpFileName);
    }
  } else {
    // En son dump dosyasını bul
    const latestDump = findLatestDump();
    if (!latestDump) {
      console.error('❌ HATA: Dump dosyası bulunamadı!');
      console.error(`   Klasör: ${DUMP_DIR}`);
      console.error('\n💡 Çözüm:');
      console.error('   1. Yerelde dump alın: npm run db:dump');
      console.error('   2. GitHub\'a commit edin ve push yapın');
      console.error('   3. Sunucuda git pull yapın');
      console.error('   4. Tekrar restore scriptini çalıştırın');
      process.exit(1);
    }
    dumpFile = latestDump.path;
    console.log(`📁 En son dump dosyası bulundu: ${basename(dumpFile)}`);
  }
  
  await restoreDatabase(dumpFile);
}

main();

