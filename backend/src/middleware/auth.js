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
