import pool from './database.js';

/**
 * Başarısız migration'ı başarılı olarak işaretle
 * Production veritabanı zaten mevcut olduğu için, başarısız görünen migration'ı düzeltir
 */
async function fixFailedMigration() {
  console.log('🔧 Fixing failed migration status...\n');

  try {
    // Database connection test
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // 001_initial_schema.sql'i başarılı olarak işaretle
    const result = await pool.query(
      `UPDATE schema_migrations 
       SET success = true, 
           error_message = NULL,
           executed_at = CURRENT_TIMESTAMP
       WHERE filename = '001_initial_schema.sql' 
       AND success = false
       RETURNING filename`
    );

    if (result.rows.length > 0) {
      console.log(`✅ Fixed: ${result.rows[0].filename}\n`);
    } else {
      console.log('ℹ️  No failed migrations to fix\n');
    }

    // Show updated status
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE success = true) as successful,
        COUNT(*) FILTER (WHERE success = false) as failed,
        COUNT(*) as total
      FROM schema_migrations
    `);

    const s = stats.rows[0];
    console.log('📊 Updated Migration Statistics:');
    console.log(`   Total executed: ${s.total}`);
    console.log(`   Successful: ${s.successful}`);
    console.log(`   Failed: ${s.failed}\n`);

    if (s.failed === 0) {
      console.log('✅ All migrations are now marked as successful!\n');
    }

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

fixFailedMigration();

