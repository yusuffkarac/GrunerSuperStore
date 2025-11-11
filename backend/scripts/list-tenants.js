import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ana .env dosyasını yükle
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

/**
 * Tenant listesi görüntüleme script'i
 */
async function listTenants() {
  console.log('📋 Tenant Listesi\n');
  console.log('='.repeat(80));

  const backendDir = path.join(__dirname, '..');
  const files = fs.readdirSync(backendDir);
  
  const tenants = [];

  // .env.{tenant-name} dosyalarını bul
  files.forEach(file => {
    if (file.startsWith('.env.') && file !== '.env.example') {
      const tenantName = file.replace('.env.', '');
      const envPath = path.join(backendDir, file);
      const tenantEnv = dotenv.config({ path: envPath });
      
      if (tenantEnv.parsed) {
        tenants.push({
          name: tenantName,
          env: tenantEnv.parsed,
          envFile: file,
        });
      }
    }
  });

  if (tenants.length === 0) {
    console.log('⚠️  Henüz tenant oluşturulmamış.');
    console.log('   Tenant oluşturmak için: node scripts/create-tenant.js <tenant-name> <subdomain>');
    return;
  }

  // Veritabanı bilgilerini kontrol et
  const masterPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    // Her tenant için detaylı bilgi göster
    for (const tenant of tenants) {
      const dbName = tenant.env.DB_NAME || `gruner_${tenant.name}`;
      const port = tenant.env.PORT || 'N/A';
      const subdomain = tenant.env.CORS_ORIGIN?.split(',')[0]?.replace(/https?:\/\//, '') || 'N/A';
      
      // Veritabanı var mı kontrol et
      let dbExists = false;
      try {
        const result = await masterPool.query(
          `SELECT 1 FROM pg_database WHERE datname = $1`,
          [dbName]
        );
        dbExists = result.rows.length > 0;
      } catch (error) {
        // Hata durumunda false olarak işaretle
      }

      // Upload klasörü var mı kontrol et
      const uploadPath = path.join(backendDir, 'uploads', tenant.name);
      const uploadExists = fs.existsSync(uploadPath);

      console.log(`\n🏢 Tenant: ${tenant.name}`);
      console.log(`   Subdomain: ${subdomain}`);
      console.log(`   Port: ${port}`);
      console.log(`   Database: ${dbName} ${dbExists ? '✅' : '❌'}`);
      console.log(`   Upload Path: uploads/${tenant.name} ${uploadExists ? '✅' : '❌'}`);
      console.log(`   Env File: ${tenant.envFile}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Toplam: ${tenants.length} tenant`);

  } catch (error) {
    console.error(`❌ Hata: ${error.message}`);
  } finally {
    await masterPool.end();
  }
}

listTenants();

