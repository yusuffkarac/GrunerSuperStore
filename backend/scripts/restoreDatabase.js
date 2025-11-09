#!/usr/bin/env node
/**
 * Veritabanı Restore Scripti
 * 
 * GitHub'dan çekilen dump dosyasını sunucudaki veritabanına yükler.
 * 
 * Kullanım:
 *   npm run db:restore [dump-file-name]
 *   veya
 *   node backend/scripts/restoreDatabase.js [dump-file-name]
 * 
 * Eğer dosya adı belirtilmezse, en son dump dosyası kullanılır.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import readline from 'readline';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env dosyasını yükle (önce backend/.env, sonra root .env)
dotenv.config({ path: join(__dirname, '../.env') });
dotenv.config({ path: join(__dirname, '../../.env') });

// Veritabanı bağlantı bilgileri
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'gruner_superstore';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD; // Opsiyonel - şifre yoksa trust/peer auth kullanılır

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
    
    // Dump dosyasını oku
    console.log('\n⏳ Dump dosyası okunuyor...');
    const dumpContent = readFileSync(dumpFile, 'utf8');
    
    // psql komutu ile restore et
    // --single-transaction: Tüm işlemi tek transaction'da yapar (hata durumunda rollback)
    // --quiet: Gereksiz çıktıları bastırır
    console.log('⏳ Veritabanı restore ediliyor...');
    const restoreCommand = `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} --single-transaction --quiet`;
    
    const { stdout, stderr } = await execAsync(restoreCommand, {
      env,
      input: dumpContent,
      maxBuffer: 1024 * 1024 * 100 // 100MB buffer
    });
    
    if (stderr && !stderr.includes('WARNING') && !stderr.includes('NOTICE')) {
      console.warn('⚠️  Uyarı:', stderr);
    }
    
    if (stdout) {
      console.log(stdout);
    }
    
    console.log('\n✅ Veritabanı başarıyla restore edildi!');
    console.log(`   Database: ${DB_NAME}`);
    
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
  let dumpFile;
  
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

