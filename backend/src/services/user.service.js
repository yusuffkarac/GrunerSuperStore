import prisma from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { Prisma } from '@prisma/client';
import {
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '../utils/errors.js';
import queueService from './queue.service.js';
import crypto from 'crypto';

class UserService {
  // Kullanıcı profil bilgilerini getir
  async getProfile(userId) {
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

  // 6 haneli doğrulama kodu oluştur
  generateVerificationCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Kullanıcı profil güncelleme (email hariç)
  async updateProfile(userId, data) {
    const { firstName, lastName, phone } = data;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone: phone || null }),
      },
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

    return user;
  }

  // Email değişikliği talebi - yeni email'e kod gönder
  async requestEmailChange(userId, newEmail) {
    // Email'i normalize et
    const normalizedEmail = newEmail.toLowerCase().trim();

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Benutzer nicht gefunden');
    }

    // Aynı email ise hata ver
    if (normalizedEmail === user.email) {
      throw new BadRequestError('Neue E-Mail-Adresse muss sich von der aktuellen unterscheiden');
    }

    // Yeni email'in başka bir kullanıcı tarafından kullanılıp kullanılmadığını kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictError('Diese E-Mail-Adresse wird bereits verwendet');
    }

    // Doğrulama kodu oluştur
    const verificationCode = this.generateVerificationCode();
    const codeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika

    // Kullanıcıyı güncelle
    await prisma.user.update({
      where: { id: userId },
      data: {
        newEmail: normalizedEmail,
        emailChangeCode: verificationCode,
        emailChangeCodeExpiry: codeExpiry,
      },
    });

    // Doğrulama maili gönder
    await this.sendEmailChangeVerificationEmail(user, normalizedEmail, verificationCode).catch((err) => {
      console.error('Email change verification mail hatası:', err);
    });

    return {
      message: 'Bestätigungscode wurde an die neue E-Mail-Adresse gesendet',
    };
  }

  // Email değişikliği doğrulama maili gönder
  async sendEmailChangeVerificationEmail(user, newEmail, verificationCode) {
    try {
      const settings = await prisma.settings.findFirst();

      // SMTP ayarları yoksa mail gönderme
      if (!settings?.smtpSettings) {
        console.log('⚠️  SMTP ayarları yapılandırılmamış, email değişikliği doğrulama maili gönderilmedi.');
        console.log(`📧 Email değişikliği kodu (Development): ${verificationCode}`);
        return;
      }

      await queueService.addEmailJob({
        to: newEmail,
        subject: 'E-Mail-Adresse ändern - Bestätigungscode',
        template: 'email-change-verification',
        data: {
          firstName: user.firstName,
          lastName: user.lastName,
          currentEmail: user.email,
          newEmail: newEmail,
          verificationCode: verificationCode,
          storeName: 'Gruner SuperStore',
        },
        metadata: { userId: user.id, type: 'email-change-verification' },
        priority: 1, // Yüksek öncelik
      });

      console.log(`✅ Email değişikliği doğrulama maili kuyruğa eklendi: ${newEmail}`);
    } catch (error) {
      console.error('Email change verification mail hatası:', error);
    }
  }

  // Email değişikliği doğrulama - kodu kontrol et ve email'i güncelle
  async verifyEmailChange(userId, code) {
    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Benutzer nicht gefunden');
    }

    // Email değişikliği talebi var mı kontrol et
    if (!user.newEmail || !user.emailChangeCode || !user.emailChangeCodeExpiry) {
      throw new BadRequestError('Keine E-Mail-Änderungsanfrage gefunden. Bitte fordern Sie zuerst eine E-Mail-Änderung an.');
    }

    // Kod süre kontrolü
    if (new Date() > user.emailChangeCodeExpiry) {
      // Süresi dolmuş kodları temizle
      await prisma.user.update({
        where: { id: userId },
        data: {
          newEmail: null,
          emailChangeCode: null,
          emailChangeCodeExpiry: null,
        },
      });
      throw new BadRequestError('Bestätigungscode ist abgelaufen. Bitte fordern Sie einen neuen Code an.');
    }

    // Kod kontrolü
    if (user.emailChangeCode !== code) {
      throw new BadRequestError('Ungültiger Bestätigungscode');
    }

    // Yeni email'in hala başka bir kullanıcı tarafından kullanılıp kullanılmadığını kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { email: user.newEmail },
    });

    if (existingUser) {
      throw new ConflictError('Diese E-Mail-Adresse wird bereits verwendet');
    }

    // Email'i güncelle ve temizle
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email: user.newEmail,
        newEmail: null,
        emailChangeCode: null,
        emailChangeCodeExpiry: null,
        isEmailVerified: true, // Yeni email doğrulanmış sayılır
      },
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

    return updatedUser;
  }

  // Şifre değiştirme
  async changePassword(userId, { currentPassword, newPassword }) {
    // Mevcut kullanıcıyı al
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Benutzer nicht gefunden');
    }

    // Mevcut şifreyi kontrol et
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError('Aktuelles Passwort ist falsch');
    }

    // Yeni şifreyi hash'le ve güncelle
    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return true;
  }

  // Kullanıcının adreslerini getir
  async getAddresses(userId) {
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return addresses;
  }

  // Yeni adres ekle
  async createAddress(userId, addressData) {
    const {
      title,
      street,
      houseNumber,
      addressLine2,
      district,
      postalCode,
      city,
      state,
      description,
      latitude,
      longitude,
      isDefault,
    } = addressData;

    // Eğer bu varsayılan adres olacaksa, diğerlerini varsayılan olmaktan çıkar
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        title,
        street,
        houseNumber,
        addressLine2: addressLine2 || null,
        district: district || null,
        postalCode,
        city,
        state,
        description: description || null,
        latitude: latitude !== undefined && latitude !== null ? new Prisma.Decimal(latitude) : null,
        longitude: longitude !== undefined && longitude !== null ? new Prisma.Decimal(longitude) : null,
        isDefault: isDefault || false,
      },
    });

    return address;
  }

  // Adresi güncelle
  async updateAddress(userId, addressId, addressData) {
    // Adresin kullanıcıya ait olduğunu kontrol et
    const existingAddress = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress) {
      throw new NotFoundError('Adresse nicht gefunden');
    }

    if (existingAddress.userId !== userId) {
      throw new ForbiddenError('Keine Berechtigung für diese Adresse');
    }

    const {
      title,
      street,
      houseNumber,
      addressLine2,
      district,
      postalCode,
      city,
      state,
      description,
      latitude,
      longitude,
      isDefault,
    } = addressData;

    // Eğer bu varsayılan adres olacaksa, diğerlerini varsayılan olmaktan çıkar
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id: addressId },
      data: {
        ...(title && { title }),
        ...(street && { street }),
        ...(houseNumber && { houseNumber }),
        ...(addressLine2 !== undefined && {
          addressLine2: addressLine2 || null,
        }),
        ...(district !== undefined && { district: district || null }),
        ...(postalCode && { postalCode }),
        ...(city && { city }),
        ...(state && { state }),
        ...(description !== undefined && { description: description || null }),
        ...(latitude !== undefined && {
          latitude: latitude !== null ? new Prisma.Decimal(latitude) : null,
        }),
        ...(longitude !== undefined && {
          longitude: longitude !== null ? new Prisma.Decimal(longitude) : null,
        }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return address;
  }

  // Adresi sil
  async deleteAddress(userId, addressId) {
    // Adresin kullanıcıya ait olduğunu kontrol et
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundError('Adresse nicht gefunden');
    }

    if (address.userId !== userId) {
      throw new ForbiddenError('Keine Berechtigung für diese Adresse');
    }

    await prisma.address.delete({
      where: { id: addressId },
    });

    return true;
  }

  // Varsayılan adresi belirle
  async setDefaultAddress(userId, addressId) {
    // Adresin kullanıcıya ait olduğunu kontrol et
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundError('Adresse nicht gefunden');
    }

    if (address.userId !== userId) {
      throw new ForbiddenError('Keine Berechtigung für diese Adresse');
    }

    // Tüm adresleri varsayılan olmaktan çıkar
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // Seçilen adresi varsayılan yap
    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return updatedAddress;
  }

  // ===============================
  // ADMIN METHODS
  // ===============================

  // Admin: Tüm kullanıcıları getir
  async getUsersForAdmin({ isActive, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' }) {
    const skip = (page - 1) * limit;

    const where = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true' || isActive === true;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              addresses: true,
              cartItems: true,
              favorites: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Admin: Kullanıcı detayı getir
  async getUserByIdForAdmin(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        addresses: {
          select: {
            id: true,
            title: true,
            street: true,
            houseNumber: true,
            city: true,
            postalCode: true,
            isDefault: true,
          },
        },
        _count: {
          select: {
            orders: true,
            addresses: true,
            cartItems: true,
            favorites: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('Benutzer nicht gefunden');
    }

    return user;
  }

  // Admin: Kullanıcı aktif/pasif yap
  async toggleUserStatus(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Benutzer nicht gefunden');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
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

    return updatedUser;
  }

  // Admin: Yeni kullanıcı oluştur
  async createUserForAdmin(data) {
    const { firstName, lastName, email, password, phone, isActive, isEmailVerified } = data;

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
        isActive: isActive !== undefined ? isActive : true,
        isEmailVerified: isEmailVerified !== undefined ? isEmailVerified : false,
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
        updatedAt: true,
      },
    });

    return user;
  }

  // Admin: Kullanıcı güncelle
  async updateUserForAdmin(userId, data) {
    const { firstName, lastName, email, password, phone, isActive, isEmailVerified } = data;

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Benutzer nicht gefunden');
    }

    // Email değişiyorsa kontrol et
    let normalizedEmail = email;
    if (email) {
      // Email'i lowercase'e çevir (+ karakterini korumak için normalizeEmail kullanmıyoruz)
      normalizedEmail = email.toLowerCase().trim();
      
      if (normalizedEmail !== user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (existingUser) {
          throw new ConflictError('E-Mail bereits registriert');
        }
      }
    }

    // Şifre değişiyorsa hash'le
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = normalizedEmail;
    if (phone !== undefined) updateData.phone = phone || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isEmailVerified !== undefined) updateData.isEmailVerified = isEmailVerified;
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }
}

export default new UserService();
