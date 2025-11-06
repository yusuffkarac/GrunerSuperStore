import { verifyToken } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import prisma from '../config/prisma.js';

// Admin JWT token doğrulama middleware
export const authenticateAdmin = async (req, res, next) => {
  try {
    console.log('🔐 [Admin Middleware] Request:', req.method, req.path);
    console.log('🔐 [Admin Middleware] Original URL:', req.originalUrl);
    console.log('🔐 [Admin Middleware] Base URL:', req.baseUrl);

    // Login endpoint'ini atla - token gerektirmez
    // req.path mount edilmiş path'i içermez, bu yüzden hem /auth/login hem de /login kontrol ediyoruz
    if (req.path === '/auth/login' || req.path === '/login' || req.originalUrl.includes('/auth/login') || req.originalUrl.includes('/admin/login')) {
      console.log('✅ [Admin Middleware] Login endpoint - middleware atlanıyor');
      return next();
    }

    // Token'ı header'dan al
    const authHeader = req.headers.authorization;
    console.log('📋 [Admin Middleware] Auth Header:', authHeader ? authHeader.substring(0, 30) + '...' : 'YOK');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ [Admin Middleware] Token header yok veya yanlış format');
      throw new UnauthorizedError('Kein Token bereitgestellt');
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 [Admin Middleware] Token extracted:', token ? token.substring(0, 20) + '...' : 'YOK');

    // Token'ı doğrula
    const decoded = verifyToken(token);
    console.log('✅ [Admin Middleware] Token decoded:', decoded);

    // Token'ın admin token'ı olduğunu kontrol et
    if (decoded.type !== 'admin') {
      console.error('❌ [Admin Middleware] Token type admin değil:', decoded.type);
      throw new ForbiddenError('Zugriff verweigert - Nur für Administratoren');
    }

    // Admin'i veritabanından bul
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
      select: {
        id: true,
        firstName: true,
        email: true,
        role: true,
      },
    });

    if (!admin) {
      console.error('❌ [Admin Middleware] Admin bulunamadı, ID:', decoded.adminId);
      throw new UnauthorizedError('Administrator nicht gefunden');
    }

    console.log('✅ [Admin Middleware] Admin doğrulandı:', admin.email);

    // Admin'i req'e ekle
    req.admin = admin;
    next();
  } catch (error) {
    console.error('❌ [Admin Middleware] Hata:', error.message);
    next(error);
  }
};

// Superadmin kontrolü (ileride gerekirse)
export const requireSuperAdmin = (req, res, next) => {
  if (req.admin.role !== 'superadmin') {
    throw new ForbiddenError('Zugriff verweigert - Nur für Super-Administratoren');
  }
  next();
};
