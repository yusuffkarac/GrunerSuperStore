import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Tek bir migration dosyasını çalıştır
 */
async function runSingleMigration(filename) {
  console.log(`🚀 Running migration: ${filename}\n`);

  try {
    // Bağlantı testi
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    const filePath = path.join(MIGRATIONS_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`📄 Executing: ${filename}\n`);

    await pool.query(sql);
    console.log(`✅ Migration completed successfully!\n`);

  } catch (error) {
    console.error(`❌ Migration failed: ${error.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Komut satırından dosya adını al
const filename = process.argv[2];

if (!filename) {
  console.log(`
Usage:
  node src/config/runSingleMigration.js <filename>
  
Example:
  node src/config/runSingleMigration.js 003_add_homepage_settings.sql
  `);
  process.exit(1);
}

runSingleMigration(filename);

