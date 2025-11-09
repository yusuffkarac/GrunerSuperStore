import prisma from '../config/prisma.js';

async function addShowOutOfStockProductsColumn() {
  try {
    // Check if column exists
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'settings' 
      AND column_name = 'show_out_of_stock_products'
    `;

    if (result.length === 0) {
      // Column doesn't exist, add it
      await prisma.$executeRaw`
        ALTER TABLE settings 
        ADD COLUMN show_out_of_stock_products BOOLEAN DEFAULT true
      `;
      
      // Update existing records
      await prisma.$executeRaw`
        UPDATE settings 
        SET show_out_of_stock_products = true 
        WHERE show_out_of_stock_products IS NULL
      `;
      
      console.log('✅ Column show_out_of_stock_products added successfully');
    } else {
      console.log('✅ Column show_out_of_stock_products already exists');
    }
  } catch (error) {
    console.error('❌ Error adding column:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addShowOutOfStockProductsColumn();

