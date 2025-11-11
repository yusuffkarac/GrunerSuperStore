import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ana .env dosyasını yükle
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

/**
 * Tenant silme script'i
 * Kullanım: node scripts/delete-tenant.js <tenant-name> [--force]
 */
async function deleteTenant() {
  const tenantName = process.argv[2];
  const force = process.argv[3] === '--force';

  if (!tenantName) {
    console.error('❌ Kullanım: node scripts/delete-tenant.js <tenant-name> [--force]');
    console.error('   Örnek: node scripts/delete-tenant.js musteri1');
    console.error('   Örnek (onay olmadan): node scripts/delete-tenant.js musteri1 --force');
    process.exit(1);
  }

  console.log(`⚠️  UYARI: Bu işlem geri alınamaz!`);
  console.log(`   Tenant: ${tenantName}`);
  console.log(`   Silinecekler:`);
  console.log(`   - Veritabanı: gruner_${tenantName}`);
  console.log(`   - .env dosyası: .env.${tenantName}`);
  console.log(`   - Upload klasörü: uploads/${tenantName}`);
  console.log(`   - PM2 process: ${tenantName}-backend (manuel silinmeli)\n`);

  if (!force) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise(resolve => {
      rl.question('Devam etmek istediğinizden emin misiniz? (yes/no): ', resolve);
    });

    rl.close();

    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('❌ İşlem iptal edildi.');
      process.exit(0);
    }
  }

  const masterPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    // 1. Veritabanını sil
    const dbName = `gruner_${tenantName}`;
    console.log(`\n🗑️  Veritabanı siliniyor: ${dbName}`);
    
    try {
      // Aktif bağlantıları kapat
      await masterPool.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `, [dbName]);
      
      await masterPool.query(`DROP DATABASE IF EXISTS ${dbName}`);
      console.log(`✅ Veritabanı silindi: ${dbName}`);
    } catch (error) {
      console.error(`❌ Veritabanı silme hatası: ${error.message}`);
    }

    // 2. .env dosyasını sil
    const envPath = path.join(__dirname, `../.env.${tenantName}`);
    console.log(`\n🗑️  .env dosyası siliniyor: .env.${tenantName}`);
    
    try {
      if (fs.existsSync(envPath)) {
        fs.unlinkSync(envPath);
        console.log(`✅ .env dosyası silindi`);
      } else {
        console.log(`⚠️  .env dosyası bulunamadı`);
      }
    } catch (error) {
      console.error(`❌ .env dosyası silme hatası: ${error.message}`);
    }

    // 3. Upload klasörünü sil
    const uploadPath = path.join(__dirname, `../uploads/${tenantName}`);
    console.log(`\n🗑️  Upload klasörü siliniyor: uploads/${tenantName}`);
    
    try {
      if (fs.existsSync(uploadPath)) {
        fs.rmSync(uploadPath, { recursive: true, force: true });
        console.log(`✅ Upload klasörü silindi`);
      } else {
        console.log(`⚠️  Upload klasörü bulunamadı`);
      }
    } catch (error) {
      console.error(`❌ Upload klasörü silme hatası: ${error.message}`);
    }

    console.log(`\n✅ Tenant silme işlemi tamamlandı: ${tenantName}`);
    console.log(`\n📝 Manuel yapılması gerekenler:`);
    console.log(`   1. PM2 process'i durdurun: pm2 delete ${tenantName}-backend`);
    console.log(`   2. PM2 ecosystem.config.js'den tenant config'ini kaldırın`);
    console.log(`   3. Nginx config'den tenant config'ini kaldırın`);
    console.log(`   4. Frontend dist klasörünü silin: frontend/dist/${tenantName}`);

  } catch (error) {
    console.error(`❌ Hata: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await masterPool.end();
  }
}

deleteTenant();

