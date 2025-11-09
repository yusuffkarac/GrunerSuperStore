import { verifyToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';
import prisma from '../config/prisma.js';

// JWT token doğrulama middleware
export const authenticate = async (req, res, next) => {
  try {
    // Token'ı header'dan al
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Kein Token bereitgestellt');
    }

    const token = authHeader.split(' ')[1];

    // Token'ı doğrula
    const decoded = verifyToken(token);

    // userId kontrolü - admin token'ları kabul etme
    if (!decoded || !decoded.userId) {
      if (decoded && decoded.adminId) {
        throw new UnauthorizedError('Admin-Token kann nicht für Benutzer-Endpunkte verwendet werden');
      }
      throw new UnauthorizedError('Ungültiger Token');
    }

    // Kullanıcıyı veritabanından bul
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Benutzer nicht gefunden');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Benutzer ist nicht aktiv');
    }

    // Kullanıcıyı req'e ekle
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Optional authentication (token varsa doğrula, yoksa devam et)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);

      if (decoded && decoded.userId) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true,
        },
      });

      if (user && user.isActive) {
        req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    // Optional auth'ta hata olursa devam et
    next();
  }
};

// SSE için authentication (query parameter'dan token alır)
export const authenticateSSE = async (req, res, next) => {
  try {
    // Önce header'dan dene
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      // Query parameter'dan al (EventSource için)
      token = req.query.token;
    }

    if (!token) {
      throw new UnauthorizedError('Kein Token bereitgestellt');
    }

    // Token'ı doğrula
    const decoded = verifyToken(token);

    // userId kontrolü - admin token'ları kabul etme
    if (!decoded || !decoded.userId) {
      if (decoded && decoded.adminId) {
        throw new UnauthorizedError('Admin-Token kann nicht für Benutzer-Endpunkte verwendet werden');
      }
      throw new UnauthorizedError('Ungültiger Token');
    }

    // Kullanıcıyı veritabanından bul
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Benutzer nicht gefunden');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Benutzer ist nicht aktiv');
    }

    // Kullanıcıyı req'e ekle
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Flexible authentication (accepts both user and admin tokens, supports query params)
// Useful for endpoints like invoice downloads where admins need access to user resources
export const authenticateFlexible = async (req, res, next) => {
  try {
    // Try header first, then query parameter
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      throw new UnauthorizedError('Kein Token bereitgestellt');
    }

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      throw new UnauthorizedError('Ungültiger Token');
    }

    // Check if it's a user token
    if (decoded.userId) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isActive: true,
        },
      });

      if (!user) {
        throw new UnauthorizedError('Benutzer nicht gefunden');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Benutzer ist nicht aktiv');
      }

      req.user = user;
      req.isAdmin = false;
    } 
    // Check if it's an admin token
    else if (decoded.adminId) {
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
        throw new UnauthorizedError('Admin nicht gefunden');
      }

      req.admin = admin;
      req.isAdmin = true;
    } 
    else {
      throw new UnauthorizedError('Ungültiger Token-Typ');
    }

    next();
  } catch (error) {
    next(error);
  }
};
