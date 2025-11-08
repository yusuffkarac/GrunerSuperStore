import { verifyToken } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import prisma from '../config/prisma.js';

// Admin JWT token doğrulama middleware
export const authenticateAdmin = async (req, res, next) => {
  try {
    // Login endpoint'ini atla - token gerektirmez
    if (req.path === '/auth/login' || req.path === '/login' || req.originalUrl.includes('/auth/login') || req.originalUrl.includes('/admin/login')) {
      return next();
    }

    // Token'ı header'dan al
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Kein Token bereitgestellt');
    }

    const token = authHeader.split(' ')[1];

    // Token'ı doğrula
    const decoded = verifyToken(token);

    // Token'ın admin token'ı olduğunu kontrol et
    if (decoded.type !== 'admin') {
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
      throw new UnauthorizedError('Administrator nicht gefunden');
    }

    // Admin'i req'e ekle
    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
};

// Superadmin kontrolü
export const requireSuperAdmin = (req, res, next) => {
  // Önce authenticateAdmin'in çalıştığından emin ol
  if (!req.admin) {
    throw new UnauthorizedError('Administrator nicht authentifiziert');
  }

  // Role kontrolü (case-insensitive ve trim)
  const adminRole = req.admin.role?.toString().trim().toLowerCase();
  
  if (adminRole !== 'superadmin') {
    throw new ForbiddenError('Zugriff verweigert - Nur für Super-Administratoren');
  }

  next();
};
