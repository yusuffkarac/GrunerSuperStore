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
    databaseUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 'not set',
  });
}

// Prisma Client singleton pattern - Her process için ayrı instance
// PM2 her process için ayrı environment variable'lar set ediyor, bu yüzden her process kendi Prisma Client'ını oluşturur
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
