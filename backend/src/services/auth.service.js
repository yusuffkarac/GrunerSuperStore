import prisma from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
} from '../utils/errors.js';
import queueService from './queue.service.js';
import crypto from 'crypto';

class AuthService {
  // 6 haneli doğrulama kodu oluştur
  generateVerificationCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

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

    // Doğrulama kodu oluştur
    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika

    // Kullanıcıyı oluştur (isActive: false - mail doğrulanana kadar)
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: normalizedEmail,
        passwordHash,
        phone: phone || null,
        isActive: false, // E-posta doğrulanana kadar pasif
        isEmailVerified: false,
        emailVerificationCode: verificationCode,
        emailVerificationCodeExpiry: verificationCodeExpiry,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    // Doğrulama maili gönder (asenkron, hata almayı engelle)
    this.sendVerificationEmail(user, verificationCode).catch((err) => {
      console.error('Verification mail hatası:', err);
    });

    // NOT: Token döndürmüyoruz, kullanıcı önce email'ini doğrulamalı
    return {
      user,
      message: 'Registrierung erfolgreich. Bitte überprüfen Sie Ihre E-Mail für den Bestätigungscode.'
    };
  }

  // E-posta doğrulama maili gönder
  async sendVerificationEmail(user, verificationCode) {
    try {
      const settings = await prisma.settings.findFirst();

      // SMTP ayarları yoksa mail gönderme
      if (!settings?.smtpSettings) {
        console.log('⚠️  SMTP ayarları yapılandırılmamış, doğrulama maili gönderilmedi.');
        console.log(`📧 Doğrulama kodu (Development): ${verificationCode}`);
        return;
      }

      await queueService.addEmailJob({
        to: user.email,
        subject: 'E-Mail-Adresse bestätigen',
        template: 'email-verification',
        data: {
          firstName: user.firstName,
          lastName: user.lastName,
          verificationCode: verificationCode,
          storeName: 'Gruner SuperStore',
        },
        metadata: { userId: user.id, type: 'email-verification' },
        priority: 1, // Yüksek öncelik
      });

      console.log(`✅ Doğrulama maili kuyruğa eklendi: ${user.email}`);
    } catch (error) {
      console.error('Verification mail hatası:', error);
    }
  }

  // E-posta doğrulama
  async verifyEmail({ email, code }) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundError('Benutzer nicht gefunden');
    }

    if (user.isEmailVerified) {
      throw new BadRequestError('E-Mail bereits bestätigt');
    }

    if (!user.emailVerificationCode || !user.emailVerificationCodeExpiry) {
      throw new BadRequestError('Kein Bestätigungscode gefunden');
    }

    // Kod süre kontrolü
    if (new Date() > user.emailVerificationCodeExpiry) {
      throw new BadRequestError('Bestätigungscode ist abgelaufen');
    }

    // Kod kontrolü
    if (user.emailVerificationCode !== code) {
      throw new BadRequestError('Ungültiger Bestätigungscode');
    }

    // Kullanıcıyı aktif et ve email'i doğrula
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        isActive: true,
        emailVerificationCode: null,
        emailVerificationCodeExpiry: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    // Token oluştur
    const token = generateToken({ userId: updatedUser.id });

    // Hoş geldin maili gönder
    this.sendWelcomeEmail(updatedUser).catch((err) => {
      console.error('Welcome mail hatası:', err);
    });

    return { user: updatedUser, token };
  }

  // Doğrulama kodunu yeniden gönder
  async resendVerificationCode(email) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundError('Benutzer nicht gefunden');
    }

    if (user.isEmailVerified) {
      throw new BadRequestError('E-Mail bereits bestätigt');
    }

    // Yeni doğrulama kodu oluştur
    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika

    // Kodu güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationCode: verificationCode,
        emailVerificationCodeExpiry: verificationCodeExpiry,
      },
    });

    // Doğrulama maili gönder
    this.sendVerificationEmail(user, verificationCode).catch((err) => {
      console.error('Verification mail hatası:', err);
    });

    return { message: 'Bestätigungscode wurde erneut gesendet' };
  }

  // Hoş geldin maili gönder (email doğrulandıktan sonra)
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

    // E-posta doğrulama kontrolü
    if (!user.isEmailVerified) {
      throw new UnauthorizedError('Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse');
    }

    // Aktif kullanıcı kontrolü
    if (!user.isActive) {
      throw new UnauthorizedError('Konto ist nicht aktiv');
    }

    // Token oluştur
    const token = generateToken({ userId: user.id });

    // Kullanıcı bilgilerini döndür (passwordHash olmadan)
    const { passwordHash, emailVerificationCode, emailVerificationCodeExpiry, ...userWithoutPassword } = user;

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
