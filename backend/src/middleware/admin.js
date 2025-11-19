import { verifyToken } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import prisma from '../config/prisma.js';

// Belirli izinler için alias (eşdeğer) tanımları
const permissionAliases = {
  settings_view: ['site_settings_manage', 'design_settings_manage'],
  settings_edit: ['site_settings_manage', 'design_settings_manage'],
};

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

    // Admin'i veritabanından bul (role ve permissions ile birlikte)
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
      select: {
        id: true,
        firstName: true,
        email: true,
        role: true,
        roleId: true,
        adminRole: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: {
                permission: {
                  select: {
                    id: true,
                    name: true,
                    displayName: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!admin) {
      throw new UnauthorizedError('Administrator nicht gefunden');
    }

    // İzinleri düz bir array'e dönüştür
    admin.permissions = admin.adminRole?.permissions?.map(rp => rp.permission) || [];

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

/**
 * İzin kontrolü middleware factory
 * @param {string|string[]} permissionNames - Gerekli izin adı veya izin adları
 * @returns {Function} Middleware function
 *
 * Kullanım:
 * router.get('/expiry', requirePermission('expiry_management_view'), controller.getExpiry)
 * router.post('/expiry/remove', requirePermission(['expiry_management_view', 'expiry_management_action']), controller.remove)
 */
export const requirePermission = (permissionNames) => {
  // permissionNames'i array'e çevir
  const requiredPermissions = Array.isArray(permissionNames) ? permissionNames : [permissionNames];

  return (req, res, next) => {
    try {
      // Önce authenticateAdmin'in çalıştığından emin ol
      if (!req.admin) {
        throw new UnauthorizedError('Administrator nicht authentifiziert');
      }

      // Superadmin her şeyi yapabilir (eski role sistemi)
      const adminRole = req.admin.role?.toString().trim().toLowerCase();
      if (adminRole === 'superadmin') {
        return next();
      }

      // Yeni rol sistemi: admin'in rolü ve izinleri varsa kontrol et
      if (!req.admin.adminRole || !req.admin.permissions || req.admin.permissions.length === 0) {
        throw new ForbiddenError('Zugriff verweigert - Keine Berechtigungen zugewiesen');
      }

      // Admin'in izinlerini kontrol et
      const adminPermissionNames = req.admin.permissions.map(p => p.name);

      const hasPermission = (permName) => {
        if (adminPermissionNames.includes(permName)) {
          return true;
        }

        const aliases = permissionAliases[permName];
        if (aliases && aliases.some(alias => adminPermissionNames.includes(alias))) {
          return true;
        }

        return false;
      };

      // Tüm gerekli izinler admin'de var mı?
      const hasAllPermissions = requiredPermissions.every(hasPermission);

      if (!hasAllPermissions) {
        const missingPerms = requiredPermissions.filter(p => !adminPermissionNames.includes(p));
        throw new ForbiddenError(
          `Zugriff verweigert - Fehlende Berechtigungen: ${missingPerms.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
