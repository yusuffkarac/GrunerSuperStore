import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import pool from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Initialize migration tracking table
 */
async function initMigrationTracking() {
  try {
    // Check if tracking table exists
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      );
    `);

    if (!checkTable.rows[0].exists) {
      console.log('📋 Creating migration tracking table...');
      const trackingMigration = fs.readFileSync(
        path.join(MIGRATIONS_DIR, '000_create_migration_tracking.sql'),
        'utf8'
      );
      await pool.query(trackingMigration);
      console.log('✅ Migration tracking table created\n');
    }
  } catch (error) {
    // If tracking migration file doesn't exist, create table manually
    if (error.code === 'ENOENT') {
      console.log('📋 Creating migration tracking table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          checksum VARCHAR(64),
          execution_time_ms INTEGER,
          success BOOLEAN DEFAULT true,
          error_message TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_filename ON schema_migrations(filename);
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at ON schema_migrations(executed_at DESC);
      `);
      console.log('✅ Migration tracking table created\n');
    } else {
      throw error;
    }
  }
}

/**
 * Get executed migrations from database
 */
async function getExecutedMigrations() {
  try {
    const result = await pool.query(
      'SELECT filename, checksum, success FROM schema_migrations ORDER BY filename'
    );
    return result.rows;
  } catch (error) {
    // Table doesn't exist yet, return empty array
    return [];
  }
}

/**
 * Calculate SHA256 checksum of file content
 */
function calculateChecksum(content) {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Record migration execution in tracking table
 */
async function recordMigration(filename, checksum, executionTime, success = true, errorMessage = null) {
  await pool.query(
    `INSERT INTO schema_migrations (filename, checksum, execution_time_ms, success, error_message)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (filename) 
     DO UPDATE SET 
       checksum = EXCLUDED.checksum,
       execution_time_ms = EXCLUDED.execution_time_ms,
       success = EXCLUDED.success,
       error_message = EXCLUDED.error_message,
       executed_at = CURRENT_TIMESTAMP`,
    [filename, checksum, executionTime, success, errorMessage]
  );
}

/**
 * Migration runner
 * Executes SQL migration files in order, tracking which ones have been executed
 */
async function runMigrations(options = {}) {
  const { dryRun = false, force = false } = options;
  
  console.log('🚀 Starting database migrations...\n');

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Initialize migration tracking
    await initMigrationTracking();

    // Get already executed migrations
    const executedMigrations = await getExecutedMigrations();
    const executedFilenames = new Set(executedMigrations.map(m => m.filename));
    const executedChecksums = new Map(
      executedMigrations.map(m => [m.filename, m.checksum])
    );

    // Read migration files
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Alphabetically sort (000_, 001_, 002_, etc.)

    if (files.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }

    console.log(`Found ${files.length} migration file(s)\n`);

    // Filter out already executed migrations (unless force flag is set)
    const pendingMigrations = files.filter(file => {
      if (force) return true;
      if (executedFilenames.has(file)) {
        // Check if file has been modified (checksum changed)
        const filePath = path.join(MIGRATIONS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const currentChecksum = calculateChecksum(content);
        const storedChecksum = executedChecksums.get(file);
        
        if (storedChecksum && storedChecksum !== currentChecksum) {
          console.log(`⚠️  WARNING: Migration ${file} has been modified since last execution!`);
          console.log(`   Stored checksum: ${storedChecksum.substring(0, 8)}...`);
          console.log(`   Current checksum: ${currentChecksum.substring(0, 8)}...`);
          console.log(`   Skipping to prevent data corruption. Use --force to override.\n`);
          return false;
        }
        return false;
      }
      return true;
    });

    if (pendingMigrations.length === 0) {
      console.log('✅ All migrations are already executed!\n');
      await showMigrationStatus();
      return;
    }

    console.log(`📋 Pending migrations: ${pendingMigrations.length}\n`);

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
      pendingMigrations.forEach(file => {
        console.log(`   Would execute: ${file}`);
      });
      console.log('');
      return;
    }

    // Execute pending migrations
    for (const file of pendingMigrations) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      const checksum = calculateChecksum(sql);
      const startTime = Date.now();

      console.log(`📄 Running: ${file}`);

      try {
        // Start transaction for this migration
        await pool.query('BEGIN');
        
        try {
          await pool.query(sql);
          const executionTime = Date.now() - startTime;
          
          // Record successful migration
          await recordMigration(file, checksum, executionTime, true, null);
          await pool.query('COMMIT');
          
          console.log(`✅ Completed: ${file} (${executionTime}ms)\n`);
        } catch (error) {
          await pool.query('ROLLBACK');
          const executionTime = Date.now() - startTime;
          
          // Record failed migration
          await recordMigration(file, checksum, executionTime, false, error.message);
          
          console.error(`❌ Failed: ${file}`);
          console.error(`Error: ${error.message}\n`);
          throw error;
        }
      } catch (error) {
        // If recording fails, still throw the original error
        throw error;
      }
    }

    console.log('✅ All migrations completed successfully!\n');

    // Show summary
    await showMigrationStatus();
    await showSummary();

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Show migration status
 */
async function showMigrationStatus() {
  try {
    const result = await pool.query(`
      SELECT 
        filename,
        executed_at,
        execution_time_ms,
        success,
        CASE WHEN success THEN '✅' ELSE '❌' END as status
      FROM schema_migrations
      ORDER BY executed_at DESC
      LIMIT 10
    `);

    if (result.rows.length > 0) {
      console.log('📋 Recent Migration Status:');
      console.log('=' .repeat(80));
      result.rows.forEach(row => {
        const time = row.execution_time_ms ? `${row.execution_time_ms}ms` : 'N/A';
        console.log(`${row.status} ${row.filename.padEnd(50)} ${row.executed_at.toISOString()} (${time})`);
      });
      console.log('=' .repeat(80) + '\n');
    }
  } catch (error) {
    // Ignore if table doesn't exist
  }
}

/**
 * Show database summary
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
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        const count = result.rows[0].count;
        console.log(`${table.padEnd(20)} : ${count} rows`);
      } catch (error) {
        // Table doesn't exist, skip
      }
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

/**
 * Show migration status without running migrations
 */
async function showStatus() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    await initMigrationTracking();

    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE success = true) as successful,
        COUNT(*) FILTER (WHERE success = false) as failed,
        COUNT(*) as total
      FROM schema_migrations
    `);

    const stats = result.rows[0];
    console.log('📋 Migration Statistics:');
    console.log(`   Total executed: ${stats.total}`);
    console.log(`   Successful: ${stats.successful}`);
    console.log(`   Failed: ${stats.failed}\n`);

    const migrations = await pool.query(`
      SELECT filename, executed_at, success, execution_time_ms
      FROM schema_migrations
      ORDER BY executed_at DESC
    `);

    if (migrations.rows.length > 0) {
      console.log('📋 Executed Migrations:');
      console.log('=' .repeat(80));
      migrations.rows.forEach(row => {
        const status = row.success ? '✅' : '❌';
        const time = row.execution_time_ms ? `${row.execution_time_ms}ms` : 'N/A';
        console.log(`${status} ${row.filename.padEnd(50)} ${row.executed_at.toISOString()} (${time})`);
      });
      console.log('=' .repeat(80) + '\n');
    }

    // Check for pending migrations
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const executedFilenames = new Set(
      (await pool.query('SELECT filename FROM schema_migrations')).rows.map(r => r.filename)
    );

    const pending = files.filter(f => !executedFilenames.has(f));
    if (pending.length > 0) {
      console.log(`⚠️  Pending migrations: ${pending.length}`);
      pending.forEach(f => console.log(`   - ${f}`));
      console.log('');
    } else {
      console.log('✅ All migrations are executed!\n');
    }

  } catch (error) {
    console.error('❌ Failed to get status:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// CLI commands
const command = process.argv[2];
const flag = process.argv[3];

const options = {
  dryRun: flag === '--dry-run' || flag === '-d',
  force: flag === '--force' || flag === '-f'
};

if (command === 'reset') {
  resetDatabase();
} else if (command === 'status' || command === 'st') {
  showStatus();
} else if (command === 'run' || !command) {
  runMigrations(options);
} else {
  console.log(`
Usage:
  npm run migrate              - Run pending migrations
  npm run migrate run          - Run pending migrations
  npm run migrate status       - Show migration status
  npm run migrate reset        - Drop all tables (DESTRUCTIVE!)
  
Options:
  --dry-run, -d                - Show what would be executed without running
  --force, -f                  - Force re-execution of modified migrations
  `);
}
