import dotenv from 'dotenv';
import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';

// .env dosyasını yükle
dotenv.config();

async function createAdmin() {
  try {
    const email = 'karacyusuf1@gmail.com';
    const password = 'Yusuf1234.';
    const firstName = 'Yusuf';

    // Şifreyi hash'le
    const passwordHash = await bcrypt.hash(password, 10);

    // Admin'i oluştur veya güncelle
    const admin = await prisma.admin.upsert({
      where: { email },
      update: {
        passwordHash,
      },
      create: {
        firstName,
        email,
        passwordHash,
        role: 'superadmin',
      },
    });

    console.log('✅ Admin başarıyla oluşturuldu!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Ad:', admin.firstName);
    console.log('🔑 Rol:', admin.role);
    console.log('\n🚀 Şimdi giriş yapabilirsiniz: http://localhost:5173/admin/login');
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
