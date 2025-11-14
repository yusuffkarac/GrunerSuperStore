import prisma from '../config/prisma.js';

async function markFooterSettingsMigration() {
  try {
    console.log('🔧 Marking footer_settings migration as applied...\n');

    // Check if migration already exists
    const existing = await prisma.$queryRaw`
      SELECT migration_name 
      FROM _prisma_migrations 
      WHERE migration_name = '20251114142852_add_footer_settings'
    `;

    if (existing.length === 0) {
      // Mark migration as applied
      await prisma.$executeRaw`
        INSERT INTO _prisma_migrations (
          id,
          checksum,
          finished_at,
          migration_name,
          logs,
          rolled_back_at,
          started_at,
          applied_steps_count
        ) VALUES (
          gen_random_uuid(),
          '',
          NOW(),
          '20251114142852_add_footer_settings',
          NULL,
          NULL,
          NOW(),
          1
        )
      `;
      
      console.log('✅ Migration marked as applied');
    } else {
      console.log('✅ Migration already marked as applied');
    }
  } catch (error) {
    console.error('❌ Error marking migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

markFooterSettingsMigration();

