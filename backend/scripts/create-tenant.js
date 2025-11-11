import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ana .env dosyasını yükle (master database bilgileri için)
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

/**
 * Tenant oluşturma script'i
 * Kullanım: node scripts/create-tenant.js <tenant-name> <subdomain> [port]
 */
async function createTenant() {
  const tenantName = process.argv[2];
  const subdomain = process.argv[3];
  const port = process.argv[4] || null;

  if (!tenantName || !subdomain) {
    console.error('❌ Kullanım: node scripts/create-tenant.js <tenant-name> <subdomain> [port]');
    console.error('   Örnek: node scripts/create-tenant.js musteri1 musteri1.superstore.com 5002');
    process.exit(1);
  }

  // Tenant name validasyonu (sadece alfanumerik ve underscore)
  if (!/^[a-z0-9_]+$/.test(tenantName)) {
    console.error('❌ Tenant adı sadece küçük harf, rakam ve underscore içerebilir');
    process.exit(1);
  }

  console.log(`🚀 Tenant oluşturuluyor: ${tenantName}`);
  console.log(`   Subdomain: ${subdomain}`);
  console.log(`   Port: ${port || 'otomatik'}\n`);

  const masterPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: 'postgres', // Master database'e bağlan
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    // 1. Veritabanı oluştur
    const dbName = `gruner_${tenantName}`;
    console.log(`📦 Veritabanı oluşturuluyor: ${dbName}`);
    
    try {
      await masterPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Veritabanı oluşturuldu: ${dbName}\n`);
    } catch (error) {
      if (error.code === '42P04') {
        console.log(`⚠️  Veritabanı zaten mevcut: ${dbName}\n`);
      } else {
        throw error;
      }
    }

    // 2. Port numarasını belirle
    let tenantPort = port;
    if (!tenantPort) {
      // Mevcut tenant'ları kontrol et ve sonraki port'u bul
      const existingPorts = await getExistingTenantPorts();
      tenantPort = findNextAvailablePort(existingPorts);
    }
    console.log(`🔌 Port numarası: ${tenantPort}\n`);

    // 3. .env dosyası oluştur
    const envPath = path.join(__dirname, `../.env.${tenantName}`);
    console.log(`📝 .env dosyası oluşturuluyor: .env.${tenantName}`);
    
    const envContent = generateEnvFile(tenantName, dbName, tenantPort, subdomain);
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ .env dosyası oluşturuldu\n`);

    // 4. Upload klasörü oluştur
    const uploadsDir = path.join(__dirname, `../uploads/${tenantName}`);
    console.log(`📁 Upload klasörü oluşturuluyor: uploads/${tenantName}`);
    
    const uploadSubdirs = ['products', 'categories', 'campaigns', 'general'];
    fs.mkdirSync(uploadsDir, { recursive: true });
    uploadSubdirs.forEach(subdir => {
      fs.mkdirSync(path.join(uploadsDir, subdir), { recursive: true });
    });
    console.log(`✅ Upload klasörleri oluşturuldu\n`);

    // 5. Migration çalıştır
    console.log(`🔄 Migration çalıştırılıyor...`);
    try {
      // Tenant-specific .env dosyasını yükle
      const tenantEnv = dotenv.config({ path: envPath });
      
      // Migration script'ini tenant .env dosyası ile çalıştır
      const migrationScript = path.join(__dirname, '../src/config/runMigrations.js');
      execSync(`node ${migrationScript} run`, {
        env: {
          ...process.env,
          ...tenantEnv.parsed,
        },
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      });
      console.log(`✅ Migration tamamlandı\n`);
    } catch (error) {
      console.error(`❌ Migration hatası: ${error.message}`);
      throw error;
    }

    // 6. PM2 config güncellemesi için bilgi ver
    console.log(`📋 PM2 Config Güncellemesi:`);
    console.log(`   Tenant: ${tenantName}`);
    console.log(`   Port: ${tenantPort}`);
    console.log(`   Env File: .env.${tenantName}`);
    console.log(`   Upload Path: uploads/${tenantName}\n`);

    console.log(`✅ Tenant başarıyla oluşturuldu: ${tenantName}`);
    console.log(`\n📝 Sonraki adımlar:`);
    console.log(`   1. PM2 ecosystem.config.js dosyasını güncelleyin`);
    console.log(`   2. Nginx konfigürasyonunu ekleyin`);
    console.log(`   3. Frontend build yapın: npm run build:tenant -- ${tenantName}`);
    console.log(`   4. PM2'yi başlatın: pm2 start ecosystem.config.js --only ${tenantName}-backend`);

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

/**
 * Mevcut tenant port'larını al
 */
async function getExistingTenantPorts() {
  const ports = [];
  
  // .env.{tenant-name} dosyalarını oku
  const backendDir = path.join(__dirname, '..');
  const files = fs.readdirSync(backendDir);
  
  files.forEach(file => {
    if (file.startsWith('.env.') && file !== '.env.example') {
      const tenantEnv = dotenv.config({ path: path.join(backendDir, file) });
      if (tenantEnv.parsed && tenantEnv.parsed.PORT) {
        ports.push(parseInt(tenantEnv.parsed.PORT));
      }
    }
  });
  
  return ports;
}

/**
 * Sonraki uygun port'u bul
 */
function findNextAvailablePort(existingPorts) {
  const startPort = 5001;
  let port = startPort;
  
  while (existingPorts.includes(port)) {
    port++;
  }
  
  return port;
}

/**
 * .env dosyası içeriği oluştur
 */
function generateEnvFile(tenantName, dbName, port, subdomain) {
  const baseEnv = {
    NODE_ENV: 'production',
    PORT: port,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || 5432,
    DB_NAME: dbName,
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    JWT_SECRET: process.env.JWT_SECRET || generateRandomSecret(),
    CORS_ORIGIN: `https://${subdomain},http://${subdomain}`,
    UPLOAD_PATH: `uploads/${tenantName}`,
  };

  // Diğer environment variable'ları kopyala
  const additionalEnv = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'OPENROUTESERVICE_API_KEY',
    'REDIS_HOST',
    'REDIS_PORT',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX_REQUESTS',
  ];

  let envContent = `# Tenant: ${tenantName}\n`;
  envContent += `# Subdomain: ${subdomain}\n`;
  envContent += `# Created: ${new Date().toISOString()}\n\n`;

  // Base env variables
  Object.entries(baseEnv).forEach(([key, value]) => {
    envContent += `${key}=${value}\n`;
  });

  // Additional env variables
  additionalEnv.forEach(key => {
    if (process.env[key]) {
      envContent += `${key}=${process.env[key]}\n`;
    }
  });

  return envContent;
}

/**
 * Random secret oluştur
 */
function generateRandomSecret() {
  return randomBytes(64).toString('hex');
}

createTenant();

