import { PrismaClient } from '@prisma/client';

// Prisma Client singleton pattern
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Development'ta her zaman yeni client oluştur
  // (Prisma client güncellendiğinde cache sorunlarını önlemek için)
  prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
  });
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
