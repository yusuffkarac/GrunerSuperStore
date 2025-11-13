import activityLogService from '../services/activityLog.service.js';
import prisma from '../config/prisma.js';

/**
 * 20 günden eski logları temizle
 * Bu script günlük olarak çalıştırılmalı (cron job veya PM2 cron)
 */
async function cleanOldLogs() {
  try {
    console.log('[cleanOldLogs] Eski loglar temizleniyor...');
    
    const result = await activityLogService.cleanOldLogs();
    
    console.log(`[cleanOldLogs] ${result.deletedCount} log silindi (${result.deletedBefore.toISOString()} tarihinden önceki)`);
    
    return result;
  } catch (error) {
    console.error('[cleanOldLogs] Hata:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script doğrudan çalıştırılıyorsa
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanOldLogs()
    .then(() => {
      console.log('[cleanOldLogs] Tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[cleanOldLogs] Hata:', error);
      process.exit(1);
    });
}

export default cleanOldLogs;

