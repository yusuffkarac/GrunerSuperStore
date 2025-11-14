import prisma from '../config/prisma.js';

async function addFooterSettingsColumn() {
  try {
    console.log('🔧 Adding footer_settings column to settings table...\n');

    // Check if column exists
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'settings' 
      AND column_name = 'footer_settings'
    `;

    if (result.length === 0) {
      // Column doesn't exist, add it
      await prisma.$executeRaw`
        ALTER TABLE settings 
        ADD COLUMN IF NOT EXISTS footer_settings JSONB
      `;
      
      console.log('✅ Column footer_settings added successfully');
    } else {
      console.log('✅ Column footer_settings already exists');
    }
  } catch (error) {
    console.error('❌ Error adding column:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addFooterSettingsColumn();

