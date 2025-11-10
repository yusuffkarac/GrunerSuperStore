import pool from './database.js';

/**
 * Mevcut migration'ları tracking tablosuna ekle
 * Production veritabanı zaten mevcut olduğu için, migration'ları "zaten çalıştırılmış" olarak işaretler
 */
async function markExistingMigrationsAsExecuted() {
  console.log('📋 Marking existing migrations as executed...\n');

  try {
    // Database connection test
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Migration tracking tablosunun var olduğundan emin ol
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

    // Mevcut migration dosyalarını al (001'den başlayarak, 000 hariç)
    const migrationsToMark = [
      '001_initial_schema.sql',
      '002_seed_data.sql',
      '003_add_homepage_settings.sql',
      '004_add_show_stock.sql',
      '005_add_order_id_format.sql',
      '006_add_business_settings.sql',
      '007_add_product_variants.sql',
      '008_add_campaigns.sql',
      '009_add_email_settings.sql',
      '010_add_theme_colors.sql',
      '011_add_email_logs.sql',
      '012_add_email_verification.sql',
      '013_add_barcode_labels.sql',
      '014_add_barcode_label_settings.sql',
      '015_add_openfoodfacts_fields.sql',
      '016_add_address_latitude_longitude.sql',
      '017_add_email_templates.sql'
    ];

    console.log(`Marking ${migrationsToMark.length} migrations as executed...\n`);

    for (const filename of migrationsToMark) {
      // Check if already exists
      const check = await pool.query(
        'SELECT filename FROM schema_migrations WHERE filename = $1',
        [filename]
      );

      if (check.rows.length === 0) {
        await pool.query(
          `INSERT INTO schema_migrations (filename, success, executed_at)
           VALUES ($1, true, CURRENT_TIMESTAMP)
           ON CONFLICT (filename) DO NOTHING`,
          [filename]
        );
        console.log(`✅ Marked as executed: ${filename}`);
      } else {
        console.log(`⏭️  Already marked: ${filename}`);
      }
    }

    console.log('\n✅ All existing migrations marked as executed!\n');

    // Show status
    const result = await pool.query(`
      SELECT COUNT(*) as total FROM schema_migrations WHERE success = true
    `);
    console.log(`📊 Total migrations marked: ${result.rows[0].total}\n`);

  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

markExistingMigrationsAsExecuted();

