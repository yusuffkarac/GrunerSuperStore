import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import prisma from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';

// .env.meral dosyasını yükle
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.meral') });

async function createMeralAdmin() {
  try {
    const email = 'webizim@gmail.com';
    const password = 'Cemal1234.';
    const firstName = 'Admin';

    console.log('🔐 Şifre hash\'leniyor...');
    // Şifreyi hash'le
    const passwordHash = await bcrypt.hash(password, 10);

    console.log('👤 Admin oluşturuluyor...');
    // Admin'i oluştur veya güncelle
    const admin = await prisma.admin.upsert({
      where: { email },
      update: {
        firstName,
        passwordHash,
        role: 'superadmin',
      },
      create: {
        firstName,
        email,
        passwordHash,
        role: 'superadmin',
      },
    });

    console.log('\n✅ Admin başarıyla oluşturuldu!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Ad:', admin.firstName);
    console.log('🔑 Rol:', admin.role);
    console.log('🆔 ID:', admin.id);
    console.log('\n🚀 Şimdi giriş yapabilirsiniz: https://meral.netwerkpro.de/admin/login');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createMeralAdmin();


