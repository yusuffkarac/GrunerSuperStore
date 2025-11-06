import prisma from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../utils/errors.js';
import queueService from './queue.service.js';

class AuthService {
  // Kullanıcı kaydı
  async register({ firstName, lastName, email, password, phone }) {
    // Email'i lowercase'e çevir (+ karakterini korumak için normalizeEmail kullanmıyoruz)
    const normalizedEmail = email.toLowerCase().trim();
    
    // Email kontrolü
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictError('E-Mail bereits registriert');
    }

    // Şifreyi hash'le
    const passwordHash = await hashPassword(password);

    // Kullanıcıyı oluştur
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: normalizedEmail,
        passwordHash,
        phone: phone || null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Token oluştur
    const token = generateToken({ userId: user.id });

    // Hoş geldin maili gönder (asenkron, hata almayı engelle)
    this.sendWelcomeEmail(user).catch((err) => {
      console.error('Welcome mail hatası:', err);
    });

    return { user, token };
  }

  // Hoş geldin maili gönder
  async sendWelcomeEmail(user) {
    try {
      const settings = await prisma.settings.findFirst();

      // SMTP ayarları yoksa mail gönderme
      if (!settings?.smtpSettings) {
        console.log('⚠️  SMTP ayarları yapılandırılmamış, hoş geldin maili gönderilmedi.');
        return;
      }

      await queueService.addEmailJob({
        to: user.email,
        subject: 'Willkommen bei Gruner SuperStore!',
        template: 'welcome',
        data: {
          firstName: user.firstName,
          lastName: user.lastName,
          shopUrl: process.env.SHOP_URL || 'http://localhost:5173',
        },
        metadata: { userId: user.id, type: 'welcome' },
        priority: 3,
      });

      console.log(`✅ Hoş geldin maili kuyruğa eklendi: ${user.email}`);
    } catch (error) {
      console.error('Welcome mail hatası:', error);
    }
  }

  // Kullanıcı girişi
  async login({ email, password }) {
    // Email'i lowercase'e çevir (+ karakterini korumak için normalizeEmail kullanmıyoruz)
    const normalizedEmail = email.toLowerCase().trim();
    
    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedError('Ungültige Anmeldedaten');
    }

    // Şifre kontrolü
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Ungültige Anmeldedaten');
    }

    // Aktif kullanıcı kontrolü
    if (!user.isActive) {
      throw new UnauthorizedError('Konto ist nicht aktiv');
    }

    // Token oluştur
    const token = generateToken({ userId: user.id });

    // Kullanıcı bilgilerini döndür (passwordHash olmadan)
    const { passwordHash, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  // Kullanıcı bilgilerini getir (token'dan)
  async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Benutzer nicht gefunden');
    }

    return user;
  }

  // Şifre sıfırlama talebi
  async forgotPassword(email) {
    // Email'i lowercase'e çevir (+ karakterini korumak için normalizeEmail kullanmıyoruz)
    const normalizedEmail = email.toLowerCase().trim();
    
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Güvenlik için kullanıcı bulunamasa bile başarılı mesajı döndür
      return {
        message:
          'Wenn die E-Mail registriert ist, wird eine Rücksetz-E-Mail gesendet',
      };
    }

    // Reset token oluştur (24 saat geçerli)
    const resetToken = generateToken({ userId: user.id, type: 'reset' }, '24h');

    // Şifre sıfırlama maili gönder
    try {
      const settings = await prisma.settings.findFirst();

      if (settings?.smtpSettings) {
        const resetUrl = `${process.env.SHOP_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

        await queueService.addEmailJob({
          to: user.email,
          subject: 'Passwort zurücksetzen',
          template: 'password-reset',
          data: {
            firstName: user.firstName,
            lastName: user.lastName,
            resetUrl,
          },
          metadata: { userId: user.id, type: 'password-reset' },
          priority: 1, // Yüksek öncelik
        });

        console.log(`✅ Şifre sıfırlama maili kuyruğa eklendi: ${user.email}`);
      } else {
        console.log('⚠️  SMTP ayarları yapılandırılmamış, şifre sıfırlama maili gönderilmedi.');
        console.log('Password reset token:', resetToken); // Development için
      }
    } catch (error) {
      console.error('Password reset mail hatası:', error);
    }

    return {
      message:
        'Wenn die E-Mail registriert ist, wird eine Rücksetz-E-Mail gesendet',
    };
  }

  // Şifre sıfırlama
  async resetPassword(token, password) {
    // Token'ı doğrula
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      // verifyToken zaten uygun hata mesajını fırlatıyor
      throw error;
    }

    if (decoded.type !== 'reset') {
      throw new UnauthorizedError('Ungültiger Token-Typ');
    }

    // Yeni şifreyi hash'le
    const passwordHash = await hashPassword(password);

    // Şifreyi güncelle
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { passwordHash },
    });

    return { message: 'Passwort erfolgreich zurückgesetzt' };
  }
}

export default new AuthService();
