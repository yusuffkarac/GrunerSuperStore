import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';
import readline from 'readline';
import { randomBytes } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ana .env dosyasını yükle
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

/**
 * Mevcut kurulu müşteriyi multi-tenant yapıya migrate etme script'i
 * Kullanım: node scripts/migrate-existing-tenant.js <tenant-name> <subdomain> [port]
 */
async function migrateExistingTenant() {
  const tenantName = process.argv[2];
  const subdomain = process.argv[3];
  const port = process.argv[4] || null;

  if (!tenantName || !subdomain) {
    console.error('❌ Kullanım: node scripts/migrate-existing-tenant.js <tenant-name> <subdomain> [port]');
    console.error('   Örnek: node scripts/migrate-existing-tenant.js musteri1 musteri1.superstore.com 5002');
    process.exit(1);
  }

  // Tenant name validasyonu
  if (!/^[a-z0-9_]+$/.test(tenantName)) {
    console.error('❌ Tenant adı sadece küçük harf, rakam ve underscore içerebilir');
    process.exit(1);
  }

  console.log(`🔄 Mevcut müşteri migrate ediliyor: ${tenantName}`);
  console.log(`   Subdomain: ${subdomain}`);
  console.log(`   Port: ${port || 'otomatik'}\n`);

  const backendDir = path.join(__dirname, '..');
  const frontendDir = path.join(__dirname, '../../frontend');

  // 1. Mevcut .env dosyasını kontrol et
  const oldEnvPath = path.join(backendDir, '.env');
  if (!fs.existsSync(oldEnvPath)) {
    console.error('❌ Mevcut .env dosyası bulunamadı:', oldEnvPath);
    console.error('   Lütfen backend/.env dosyasının var olduğundan emin olun');
    process.exit(1);
  }

  console.log('📋 Mevcut .env dosyası bulundu\n');

  // 2. Mevcut veritabanı adını al
  const oldEnv = dotenv.config({ path: oldEnvPath });
  const oldDbName = oldEnv.parsed?.DB_NAME || 'gruner_superstore';
  const oldPort = oldEnv.parsed?.PORT || '5001';

  console.log(`📊 Mevcut Konfigürasyon:`);
  console.log(`   Database: ${oldDbName}`);
  console.log(`   Port: ${oldPort}\n`);

  // 3. Kullanıcıya onay sor
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

  const masterPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    // 4. Veritabanı adını değiştir (eğer farklıysa)
    let newDbName = `gruner_${tenantName}`;
    let dbRenamed = false;

    if (oldDbName !== newDbName) {
      console.log(`🔄 Veritabanı adı değiştiriliyor: ${oldDbName} -> ${newDbName}`);
      
      // Veritabanının var olduğunu kontrol et
      const dbCheck = await masterPool.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [oldDbName]
      );

      if (dbCheck.rows.length > 0) {
        try {
          // Aktif bağlantıları kapat
          await masterPool.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = $1 AND pid <> pg_backend_pid()
          `, [oldDbName]);

          // Veritabanını yeniden adlandır
          await masterPool.query(`ALTER DATABASE ${oldDbName} RENAME TO ${newDbName}`);
          console.log(`✅ Veritabanı adı değiştirildi\n`);
          dbRenamed = true;
        } catch (error) {
          // Eğer veritabanı adını değiştiremezsek, mevcut adı kullanmaya devam et
          if (error.message.includes('must be owner') || error.message.includes('permission denied')) {
            console.log(`⚠️  Veritabanı adı değiştirilemedi: ${error.message}`);
            console.log(`   Mevcut veritabanı adı kullanılacak: ${oldDbName}`);
            console.log(`   .env dosyasında DB_NAME=${oldDbName} olarak ayarlanacak\n`);
            // newDbName'i eski adla değiştir
            newDbName = oldDbName;
          } else {
            throw error;
          }
        }
      } else {
        console.log(`⚠️  Veritabanı bulunamadı: ${oldDbName}`);
        console.log(`   Yeni veritabanı oluşturulacak: ${newDbName}\n`);
      }
    } else {
      console.log(`✅ Veritabanı adı zaten doğru: ${oldDbName}\n`);
      newDbName = oldDbName;
    }

    // 5. Port numarasını belirle
    let tenantPort = port;
    if (!tenantPort) {
      // Mevcut port'u kullan veya yeni port bul
      const existingPorts = await getExistingTenantPorts(backendDir);
      if (existingPorts.includes(parseInt(oldPort))) {
        // Mevcut port kullanılıyorsa yeni port bul
        tenantPort = findNextAvailablePort(existingPorts);
      } else {
        tenantPort = oldPort;
      }
    }
    console.log(`🔌 Port numarası: ${tenantPort}\n`);

    // 6. Yeni .env dosyası oluştur
    const newEnvPath = path.join(backendDir, `.env.${tenantName}`);
    console.log(`📝 Yeni .env dosyası oluşturuluyor: .env.${tenantName}`);
    
    // newDbName değişkenini kullan (eğer rename başarısız olduysa eski ad kullanılır)
    const finalDbName = newDbName || `gruner_${tenantName}`;
    const envContent = generateEnvFile(tenantName, finalDbName, tenantPort, subdomain, oldEnv.parsed);
    fs.writeFileSync(newEnvPath, envContent);
    console.log(`✅ .env dosyası oluşturuldu\n`);

    // 7. Upload klasörünü taşı
    const oldUploadsDir = path.join(backendDir, 'uploads');
    const newUploadsDir = path.join(backendDir, 'uploads', tenantName);
    
    console.log(`📁 Upload klasörü taşınıyor: uploads -> uploads/${tenantName}`);
    
    if (fs.existsSync(oldUploadsDir)) {
      // Eğer zaten tenant-specific klasör yoksa taşı
      if (!fs.existsSync(newUploadsDir)) {
        fs.mkdirSync(path.dirname(newUploadsDir), { recursive: true });
        
        // Klasör içeriğini taşı
        const items = fs.readdirSync(oldUploadsDir);
        items.forEach(item => {
          const oldPath = path.join(oldUploadsDir, item);
          const newPath = path.join(newUploadsDir, item);
          
          // Eğer klasör ise recursive taşı
          if (fs.statSync(oldPath).isDirectory()) {
            fs.mkdirSync(newPath, { recursive: true });
            copyDirectory(oldPath, newPath);
            fs.rmSync(oldPath, { recursive: true });
          } else {
            fs.copyFileSync(oldPath, newPath);
            fs.unlinkSync(oldPath);
          }
        });
        
        console.log(`✅ Upload klasörü taşındı\n`);
      } else {
        console.log(`⚠️  Upload klasörü zaten mevcut: uploads/${tenantName}`);
        console.log(`   Mevcut klasör korunuyor\n`);
      }
    } else {
      // Upload klasörü yoksa oluştur
      const uploadSubdirs = ['products', 'categories', 'campaigns', 'general'];
      fs.mkdirSync(newUploadsDir, { recursive: true });
      uploadSubdirs.forEach(subdir => {
        fs.mkdirSync(path.join(newUploadsDir, subdir), { recursive: true });
      });
      console.log(`✅ Upload klasörü oluşturuldu\n`);
    }

    // 8. Frontend dist klasörünü taşı (varsa)
    const oldFrontendDist = path.join(frontendDir, 'dist');
    const newFrontendDist = path.join(frontendDir, 'dist', tenantName);
    
    if (fs.existsSync(oldFrontendDist)) {
      console.log(`📁 Frontend dist klasörü taşınıyor: dist -> dist/${tenantName}`);
      
      // Eğer zaten tenant-specific klasör yoksa taşı
      if (!fs.existsSync(newFrontendDist)) {
        fs.mkdirSync(path.dirname(newFrontendDist), { recursive: true });
        copyDirectory(oldFrontendDist, newFrontendDist);
        console.log(`✅ Frontend dist klasörü taşındı\n`);
      } else {
        console.log(`⚠️  Frontend dist klasörü zaten mevcut: dist/${tenantName}`);
        console.log(`   Mevcut klasör korunuyor\n`);
      }
    }

    // 9. Eski .env dosyasını yedekle (opsiyonel)
    const backupEnvPath = path.join(backendDir, `.env.backup.${Date.now()}`);
    console.log(`💾 Eski .env dosyası yedekleniyor: ${backupEnvPath}`);
    fs.copyFileSync(oldEnvPath, backupEnvPath);
    console.log(`✅ Yedek oluşturuldu\n`);

    // 10. PM2 config güncellemesi için bilgi ver
    console.log(`📋 Sonraki Adımlar:`);
    console.log(`   1. PM2 process'i durdurun: pm2 delete all`);
    console.log(`   2. PM2 ecosystem.config.js'i güncelleyin (otomatik tenant bulma)`);
    console.log(`   3. PM2'yi başlatın: pm2 start ecosystem.config.js --only ${tenantName}-backend`);
    console.log(`   4. Frontend build yapın: cd scripts && ./build-tenant.sh ${tenantName} ${subdomain}`);
    console.log(`   5. Nginx config oluşturun: ./generate-nginx-config.sh ${tenantName} ${subdomain} ${tenantPort}`);
    console.log(`   6. Eski .env dosyasını silmek isteyebilirsiniz (yedek alındı)`);
    console.log(`\n✅ Migration tamamlandı: ${tenantName}`);

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
 * Klasörü recursive kopyala
 */
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const items = fs.readdirSync(src);
  items.forEach(item => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

/**
 * Mevcut tenant port'larını al
 */
async function getExistingTenantPorts(backendDir) {
  const ports = [];
  const files = fs.readdirSync(backendDir);
  
  files.forEach(file => {
    if (file.startsWith('.env.') && file !== '.env.example' && !file.startsWith('.env.backup')) {
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
function generateEnvFile(tenantName, dbName, port, subdomain, oldEnv) {
  const baseEnv = {
    NODE_ENV: oldEnv?.NODE_ENV || 'production',
    PORT: port,
    DB_HOST: oldEnv?.DB_HOST || process.env.DB_HOST || 'localhost',
    DB_PORT: oldEnv?.DB_PORT || process.env.DB_PORT || 5432,
    DB_NAME: dbName,
    DB_USER: oldEnv?.DB_USER || process.env.DB_USER || 'postgres',
    DB_PASSWORD: oldEnv?.DB_PASSWORD || process.env.DB_PASSWORD || '',
    JWT_SECRET: oldEnv?.JWT_SECRET || process.env.JWT_SECRET || generateRandomSecret(),
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
  envContent += `# Migrated from existing installation\n`;
  envContent += `# Created: ${new Date().toISOString()}\n\n`;

  // Base env variables
  Object.entries(baseEnv).forEach(([key, value]) => {
    envContent += `${key}=${value}\n`;
  });

  // Additional env variables (eski değerleri koru)
  additionalEnv.forEach(key => {
    if (oldEnv && oldEnv[key]) {
      envContent += `${key}=${oldEnv[key]}\n`;
    } else if (process.env[key]) {
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

migrateExistingTenant();

