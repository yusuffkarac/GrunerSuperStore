#!/usr/bin/env node
/**
 * Veritabanı Dump Scripti
 * 
 * Yerel veritabanının tam içeriğini SQL formatında dışa aktarır.
 * Oluşturulan dump dosyası GitHub'a commit edilebilir ve sunucuda restore edilebilir.
 * 
 * Kullanım:
 *   npm run db:dump
 *   veya
 *   node backend/scripts/dumpDatabase.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                  new Date().toTimeString().split(' ')[0].replace(/:/g, '');
const DUMP_FILE = join(DUMP_DIR, `dump_${DB_NAME}_${TIMESTAMP}.sql`);

async function createDump() {
  try {
    console.log('📦 Veritabanı dump işlemi başlatılıyor...');
    console.log(`   Database: ${DB_NAME}`);
    console.log(`   Host: ${DB_HOST}:${DB_PORT}`);
    console.log(`   User: ${DB_USER}`);
    if (DB_PASSWORD) {
      console.log(`   Authentication: Password`);
    } else {
      console.log(`   Authentication: Trust/Peer (şifre yok)`);
    }
    
    // Dump klasörünü oluştur
    mkdirSync(DUMP_DIR, { recursive: true });
    
    // Environment variables - şifre varsa PGPASSWORD set et
    const env = {
      ...process.env
    };
    if (DB_PASSWORD) {
      env.PGPASSWORD = DB_PASSWORD;
    }
    
    // pg_dump komutu
    // --inserts: INSERT statements kullanır (daha okunabilir ve GitHub-friendly)
    // --column-inserts: Kolon isimleriyle birlikte INSERT (daha güvenli)
    // --no-owner: Owner bilgilerini dahil etme (sunucuda farklı user olabilir)
    // --no-privileges: Privilege bilgilerini dahil etme
    // Not: --clean kullanmıyoruz çünkü restore scripti zaten veritabanını temizliyor
    const dumpCommand = `pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} --inserts --column-inserts --no-owner --no-privileges`;
    
    console.log('\n⏳ Dump alınıyor...');
    const { stdout, stderr } = await execAsync(dumpCommand, { 
      env,
      maxBuffer: 1024 * 1024 * 100 // 100MB buffer
    });
    
    if (stderr && !stderr.includes('WARNING')) {
      console.warn('⚠️  Uyarı:', stderr);
    }
    
    // Dump'ı dosyaya yaz
    writeFileSync(DUMP_FILE, stdout, 'utf8');
    
    // Dosya boyutunu kontrol et
    const fs = await import('fs');
    const stats = fs.statSync(DUMP_FILE);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('\n✅ Dump başarıyla oluşturuldu!');
    console.log(`   Dosya: ${DUMP_FILE}`);
    console.log(`   Boyut: ${fileSizeMB} MB`);
    console.log('\n📝 Sonraki adımlar:');
    console.log('   1. Dump dosyasını GitHub\'a commit edin:');
    console.log(`      git add ${DUMP_FILE}`);
    console.log('      git commit -m "feat: veritabanı dump eklendi"');
    console.log('      git push');
    console.log('\n   2. Sunucuda restore scriptini çalıştırın:');
    console.log('      npm run db:restore');
    
  } catch (error) {
    console.error('\n❌ HATA: Dump oluşturulurken bir hata oluştu!');
    console.error('   Hata:', error.message);
    
    if (error.message.includes('pg_dump: command not found')) {
      console.error('\n💡 Çözüm: PostgreSQL client tools yüklü değil.');
      console.error('   macOS: brew install postgresql');
      console.error('   Ubuntu: sudo apt-get install postgresql-client');
      console.error('   Windows: https://www.postgresql.org/download/windows/');
    }
    
    process.exit(1);
  }
}

createDump();

