import { PrismaClient } from '@prisma/client';

// PM2 environment variable'larını kullan (dotenv.config() çağrısı yok - PM2 zaten set ediyor)
// DATABASE_URL'i her zaman DB_NAME'den oluştur (DB_NAME varsa)
// .env dosyasındaki DATABASE_URL'i ignore et - her zaman DB_NAME'den oluştur
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 5432;
const dbName = process.env.DB_NAME || 'gruner_superstore';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || '';

// DATABASE_URL'i her zaman DB_NAME'den oluştur
// Connection pool ayarları: connection_limit=20, pool_timeout=10
process.env.DATABASE_URL = `postgresql://${dbUser}${dbPassword ? ':' + dbPassword : ''}@${dbHost}:${dbPort}/${dbName}?connection_limit=20&pool_timeout=10`;

// Database connection bilgisini logla (debug için)
// bu

// Prisma Client singleton pattern - Her process için ayrı instance
// PM2 her process için ayrı environment variable'lar set ediyor, bu yüzden her process kendi Prisma Client'ını oluşturur
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error', 'warn'],
  });

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
