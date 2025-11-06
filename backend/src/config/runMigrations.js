import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Migration runner
 * Executes SQL migration files in order
 */
async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  try {
    // Verbindung testen
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Migration-Dateien lesen
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Alphabetisch sortieren (001_, 002_, etc.)

    if (files.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }

    console.log(`Found ${files.length} migration file(s):\n`);

    // Jede Migration ausführen
    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`📄 Running: ${file}`);

      try {
        await pool.query(sql);
        console.log(`✅ Completed: ${file}\n`);
      } catch (error) {
        console.error(`❌ Failed: ${file}`);
        console.error(`Error: ${error.message}\n`);

        // Bei Fehler stoppen
        throw error;
      }
    }

    console.log('✅ All migrations completed successfully!\n');

    // Zusammenfassung anzeigen
    await showSummary();

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Zeigt eine Zusammenfassung der Datenbank
 */
async function showSummary() {
  console.log('📊 Database Summary:');
  console.log('=' .repeat(50));

  try {
    const tables = [
      'users',
      'addresses',
      'categories',
      'products',
      'cart_items',
      'orders',
      'order_items',
      'favorites',
      'delivery_zones',
      'admins'
    ];

    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      const count = result.rows[0].count;
      console.log(`${table.padEnd(20)} : ${count} rows`);
    }

    console.log('=' .repeat(50) + '\n');
  } catch (error) {
    console.error('Could not fetch summary:', error.message);
  }
}

/**
 * Reset database (VORSICHT: Löscht alle Daten!)
 */
async function resetDatabase() {
  console.log('⚠️  WARNING: This will drop all tables and data!\n');

  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    console.log('🗑️  Dropping all tables...\n');

    // Tables in richtiger Reihenfolge löschen (wegen Foreign Keys)
    const dropSQL = `
      DROP TABLE IF EXISTS order_items CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS cart_items CASCADE;
      DROP TABLE IF EXISTS favorites CASCADE;
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS categories CASCADE;
      DROP TABLE IF EXISTS addresses CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS delivery_zones CASCADE;
      DROP TABLE IF EXISTS admins CASCADE;

      DROP TYPE IF EXISTS order_type CASCADE;
      DROP TYPE IF EXISTS order_status CASCADE;
      DROP TYPE IF EXISTS payment_type CASCADE;

      DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    `;

    await pool.query(dropSQL);
    console.log('✅ All tables dropped\n');

  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// CLI commands
const command = process.argv[2];

if (command === 'reset') {
  resetDatabase();
} else if (command === 'run' || !command) {
  runMigrations();
} else {
  console.log(`
Usage:
  npm run migrate          - Run all migrations
  npm run migrate run      - Run all migrations
  npm run migrate reset    - Drop all tables (DESTRUCTIVE!)
  `);
}
