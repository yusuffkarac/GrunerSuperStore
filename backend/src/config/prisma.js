import { PrismaClient } from '@prisma/client';

// PM2 environment variable'larını kullan (dotenv.config() çağrısı yok - PM2 zaten set ediyor)
// DATABASE_URL'i environment'tan oluştur (eğer yoksa)
if (!process.env.DATABASE_URL) {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 5432;
  const dbName = process.env.DB_NAME || 'gruner_superstore';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || '';
  
  process.env.DATABASE_URL = `postgresql://${dbUser}${dbPassword ? ':' + dbPassword : ''}@${dbHost}:${dbPort}/${dbName}`;
}

// Database connection bilgisini logla (debug için)
if (process.env.NODE_ENV === 'production') {
  console.log('🔌 Database Connection:', {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'gruner_superstore',
    user: process.env.DB_USER || 'postgres',
  });
}

// Prisma Client singleton pattern
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
} else {
  // Development'ta her zaman yeni client oluştur
  // (Prisma client güncellendiğinde cache sorunlarını önlemek için)
  prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
