import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import prisma from '../src/config/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    console.log('📝 Activity Logs migration başlatılıyor...');

    const sqlFile = join(__dirname, '../prisma/migrations/add_activity_logs_manual.sql');
    const sql = readFileSync(sqlFile, 'utf-8');

    // SQL'i satırlara böl ve çalıştır
    // Önce yorumları temizle
    const cleanSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // Statement'ları ayır (noktalı virgül ile)
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📝 ${statements.length} statement bulundu`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`📝 Statement ${i + 1}/${statements.length} çalıştırılıyor...`);
          await prisma.$executeRawUnsafe(statement + ';');
          console.log(`✅ Statement ${i + 1} başarılı`);
        } catch (error) {
          // Eğer "already exists" hatası ise devam et
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate') ||
              error.message.includes('already exists')) {
            console.log(`⚠️  Statement ${i + 1} zaten var, atlanıyor...`);
          } else {
            console.error(`❌ Statement ${i + 1} hatası:`, error.message);
            console.error('Statement:', statement.substring(0, 100));
            throw error;
          }
        }
      }
    }

    console.log('✅ Migration tamamlandı!');
  } catch (error) {
    console.error('❌ Migration hatası:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

