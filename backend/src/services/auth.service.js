import prisma from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../utils/errors.js';

class AuthService {
  // Kullanıcı kaydı
  async register({ firstName, lastName, email, password, phone }) {
    // Email kontrolü
    const existingUser = await prisma.user.findUnique({
      where: { email },
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
        email,
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

    return { user, token };
  }

  // Kullanıcı girişi
  async login({ email, password }) {
    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email },
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
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Güvenlik için kullanıcı bulunamasa bile başarılı mesajı döndür
      return {
        message:
          'Wenn die E-Mail registriert ist, wird eine Rücksetz-E-Mail gesendet',
      };
    }

    // Reset token oluştur (30 dakika geçerli)
    const resetToken = generateToken({ userId: user.id, type: 'reset' });

    // TODO: Email gönderme servisi buraya eklenecek
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    console.log('Password reset token:', resetToken); // Development için

    return {
      message:
        'Wenn die E-Mail registriert ist, wird eine Rücksetz-E-Mail gesendet',
    };
  }

  // Şifre sıfırlama
  async resetPassword(token, newPassword) {
    // Token'ı doğrula
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      throw new UnauthorizedError('Ungültiger oder abgelaufener Token');
    }

    if (decoded.type !== 'reset') {
      throw new UnauthorizedError('Ungültiger Token-Typ');
    }

    // Yeni şifreyi hash'le
    const passwordHash = await hashPassword(newPassword);

    // Şifreyi güncelle
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { passwordHash },
    });

    return { message: 'Passwort erfolgreich zurückgesetzt' };
  }
}

export default new AuthService();
