import pool from './database.js';

/**
 * Eksik kolonları ekle
 * Production veritabanında eksik olan kolonları ekler
 */
async function addMissingColumns() {
  console.log('🔧 Adding missing columns to database...\n');

  try {
    // Database connection test
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // 1. email_templates kolonunu ekle
    console.log('📋 Adding email_templates column to settings table...');
    try {
      await pool.query(`
        ALTER TABLE settings 
        ADD COLUMN IF NOT EXISTS email_templates JSONB;
      `);
      console.log('✅ email_templates column added\n');
    } catch (error) {
      if (error.code === '42701') { // column already exists
        console.log('⏭️  email_templates column already exists\n');
      } else {
        throw error;
      }
    }

    // 1b. notification_templates kolonunu ekle
    console.log('📋 Adding notification_templates column to settings table...');
    try {
      await pool.query(`
        ALTER TABLE settings 
        ADD COLUMN IF NOT EXISTS notification_templates JSONB;
      `);
      console.log('✅ notification_templates column added\n');
    } catch (error) {
      if (error.code === '42701') { // column already exists
        console.log('⏭️  notification_templates column already exists\n');
      } else {
        throw error;
      }
    }

    // 1c. addresses tablosuna latitude ve longitude kolonlarını ekle
    console.log('📋 Adding latitude and longitude columns to addresses table...');
    try {
      await pool.query(`
        ALTER TABLE addresses 
        ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
        ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
      `);
      console.log('✅ latitude and longitude columns added\n');
    } catch (error) {
      if (error.code === '42701') { // column already exists
        console.log('⏭️  latitude/longitude columns already exist\n');
      } else {
        console.error('⚠️  Error adding latitude/longitude:', error.message);
        // Devam et, diğer kolonları eklemeye çalış
      }
    }

    // 2. role_id kolonunu ekle
    console.log('📋 Adding role_id column to admins table...');
    try {
      // Önce kolonun var olup olmadığını kontrol et
      const checkColumn = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'admins' 
        AND column_name = 'role_id'
      `);

      if (checkColumn.rows.length === 0) {
        // Kolon yok, ekle
        await pool.query(`
          ALTER TABLE admins 
          ADD COLUMN role_id UUID;
        `);

        // Foreign key constraint ekle (admin_roles tablosu varsa)
        const checkTable = await pool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_name = 'admin_roles'
        `);

        if (checkTable.rows.length > 0) {
          await pool.query(`
            ALTER TABLE admins 
            ADD CONSTRAINT admins_role_id_fkey 
            FOREIGN KEY (role_id) 
            REFERENCES admin_roles(id) 
            ON DELETE SET NULL;
          `);
        }

        // Index ekle
        await pool.query(`
          CREATE INDEX IF NOT EXISTS admins_role_id_idx ON admins(role_id);
        `);

        console.log('✅ role_id column added\n');
      } else {
        console.log('⏭️  role_id column already exists\n');
      }
    } catch (error) {
      if (error.code === '42701') { // column already exists
        console.log('⏭️  role_id column already exists\n');
      } else {
        console.error('⚠️  Error adding role_id:', error.message);
        // Devam et, diğer kolonları eklemeye çalış
      }
    }

    // 3. admin_roles ve admin_permissions tablolarını kontrol et
    console.log('📋 Checking role system tables...');
    const checkAdminRoles = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'admin_roles'
    `);

    if (checkAdminRoles.rows.length === 0) {
      console.log('⚠️  admin_roles table does not exist. You may need to run the role permission system migration.\n');
    } else {
      console.log('✅ admin_roles table exists\n');
    }

    console.log('✅ Missing columns check completed!\n');

    // Verification
    console.log('📊 Verification:');
    const settingsColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'settings' 
      AND column_name IN ('email_templates', 'notification_templates')
    `);
    const existingSettingsColumns = settingsColumns.rows.map(r => r.column_name);
    console.log(`   email_templates: ${existingSettingsColumns.includes('email_templates') ? '✅ Exists' : '❌ Missing'}`);
    console.log(`   notification_templates: ${existingSettingsColumns.includes('notification_templates') ? '✅ Exists' : '❌ Missing'}`);

    const addressColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'addresses' 
      AND column_name IN ('latitude', 'longitude')
    `);
    const existingAddressColumns = addressColumns.rows.map(r => r.column_name);
    console.log(`   addresses.latitude: ${existingAddressColumns.includes('latitude') ? '✅ Exists' : '❌ Missing'}`);
    console.log(`   addresses.longitude: ${existingAddressColumns.includes('longitude') ? '✅ Exists' : '❌ Missing'}`);

    const adminColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'admins' 
      AND column_name = 'role_id'
    `);
    console.log(`   role_id: ${adminColumns.rows.length > 0 ? '✅ Exists' : '❌ Missing'}\n`);

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

addMissingColumns();

