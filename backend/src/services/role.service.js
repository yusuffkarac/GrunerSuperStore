import prisma from '../config/prisma.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

// ===================================
// ROLE MANAGEMENT
// ===================================

/**
 * Tüm rolleri listele
 */
export const getAllRoles = async () => {
  const roles = await prisma.adminRole.findMany({
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: { admins: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Permissions'ı düz array'e dönüştür
  return roles.map(role => ({
    ...role,
    permissions: role.permissions.map(rp => rp.permission),
    adminCount: role._count.admins,
  }));
};

/**
 * Tek bir rol detayı
 */
export const getRoleById = async (roleId) => {
  const role = await prisma.adminRole.findUnique({
    where: { id: roleId },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      admins: {
        select: {
          id: true,
          firstName: true,
          email: true,
        },
      },
    },
  });

  if (!role) {
    throw new NotFoundError('Rol bulunamadı');
  }

  return {
    ...role,
    permissions: role.permissions.map(rp => rp.permission),
  };
};

/**
 * Yeni rol oluştur
 */
export const createRole = async (data) => {
  const { name, description, permissionIds } = data;

  // Aynı isimde rol var mı kontrol et
  const existingRole = await prisma.adminRole.findUnique({
    where: { name },
  });

  if (existingRole) {
    throw new BadRequestError('Bu isimde bir rol zaten mevcut');
  }

  // Rolü oluştur
  const role = await prisma.adminRole.create({
    data: {
      name,
      description,
    },
  });

  // İzinleri ekle
  if (permissionIds && permissionIds.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map(permissionId => ({
        roleId: role.id,
        permissionId,
      })),
    });
  }

  return getRoleById(role.id);
};

/**
 * Rolü güncelle
 */
export const updateRole = async (roleId, data) => {
  const { name, description, isActive, permissionIds } = data;

  // Rolün varlığını kontrol et
  const existingRole = await prisma.adminRole.findUnique({
    where: { id: roleId },
  });

  if (!existingRole) {
    throw new NotFoundError('Rol bulunamadı');
  }

  // İsim değişiyorsa, aynı isimde başka rol var mı kontrol et
  if (name && name !== existingRole.name) {
    const duplicateRole = await prisma.adminRole.findUnique({
      where: { name },
    });

    if (duplicateRole) {
      throw new BadRequestError('Bu isimde bir rol zaten mevcut');
    }
  }

  // Rolü güncelle
  const role = await prisma.adminRole.update({
    where: { id: roleId },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  // İzinleri güncelle (eğer belirtilmişse)
  if (permissionIds !== undefined) {
    // Önce mevcut izinleri sil
    await prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Yeni izinleri ekle
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({
          roleId,
          permissionId,
        })),
      });
    }
  }

  return getRoleById(roleId);
};

/**
 * Rolü sil
 */
export const deleteRole = async (roleId) => {
  // Rolün varlığını kontrol et
  const role = await prisma.adminRole.findUnique({
    where: { id: roleId },
    include: {
      _count: {
        select: { admins: true },
      },
    },
  });

  if (!role) {
    throw new NotFoundError('Rol bulunamadı');
  }

  // Bu role sahip admin var mı kontrol et
  if (role._count.admins > 0) {
    throw new BadRequestError(
      `Bu rol ${role._count.admins} admin tarafından kullanılıyor. Önce bu adminlerin rollerini değiştirin.`
    );
  }

  // Rolü sil (RolePermission'lar CASCADE ile otomatik silinecek)
  await prisma.adminRole.delete({
    where: { id: roleId },
  });

  return { success: true, message: 'Rol başarıyla silindi' };
};

// ===================================
// PERMISSION MANAGEMENT
// ===================================

/**
 * Tüm izinleri listele
 */
export const getAllPermissions = async () => {
  const permissions = await prisma.adminPermission.findMany({
    orderBy: [
      { category: 'asc' },
      { displayName: 'asc' },
    ],
  });

  // Kategorilere göre grupla
  const grouped = permissions.reduce((acc, perm) => {
    const category = perm.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {});

  return {
    all: permissions,
    grouped,
  };
};

/**
 * Yeni izin oluştur
 */
export const createPermission = async (data) => {
  const { name, displayName, description, category } = data;

  // Aynı isimde izin var mı kontrol et
  const existingPermission = await prisma.adminPermission.findUnique({
    where: { name },
  });

  if (existingPermission) {
    throw new BadRequestError('Bu isimde bir izin zaten mevcut');
  }

  const permission = await prisma.adminPermission.create({
    data: {
      name,
      displayName,
      description,
      category,
    },
  });

  return permission;
};

/**
 * İzni güncelle
 */
export const updatePermission = async (permissionId, data) => {
  const { name, displayName, description, category } = data;

  const existingPermission = await prisma.adminPermission.findUnique({
    where: { id: permissionId },
  });

  if (!existingPermission) {
    throw new NotFoundError('İzin bulunamadı');
  }

  // İsim değişiyorsa, aynı isimde başka izin var mı kontrol et
  if (name && name !== existingPermission.name) {
    const duplicatePermission = await prisma.adminPermission.findUnique({
      where: { name },
    });

    if (duplicatePermission) {
      throw new BadRequestError('Bu isimde bir izin zaten mevcut');
    }
  }

  const permission = await prisma.adminPermission.update({
    where: { id: permissionId },
    data: {
      ...(name && { name }),
      ...(displayName && { displayName }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
    },
  });

  return permission;
};

/**
 * İzni sil
 */
export const deletePermission = async (permissionId) => {
  const permission = await prisma.adminPermission.findUnique({
    where: { id: permissionId },
    include: {
      _count: {
        select: { roles: true },
      },
    },
  });

  if (!permission) {
    throw new NotFoundError('İzin bulunamadı');
  }

  // Bu izin kullanan rol var mı kontrol et
  if (permission._count.roles > 0) {
    throw new BadRequestError(
      `Bu izin ${permission._count.roles} rol tarafından kullanılıyor. Önce bu rollerden izni kaldırın.`
    );
  }

  await prisma.adminPermission.delete({
    where: { id: permissionId },
  });

  return { success: true, message: 'İzin başarıyla silindi' };
};

/**
 * Admin'e rol ata
 */
export const assignRoleToAdmin = async (adminId, roleId) => {
  // Admin var mı kontrol et
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
  });

  if (!admin) {
    throw new NotFoundError('Admin bulunamadı');
  }

  // Rol var mı kontrol et
  const role = await prisma.adminRole.findUnique({
    where: { id: roleId },
  });

  if (!role) {
    throw new NotFoundError('Rol bulunamadı');
  }

  // Admin'e rolü ata
  const updatedAdmin = await prisma.admin.update({
    where: { id: adminId },
    data: { roleId },
    include: {
      adminRole: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  return updatedAdmin;
};
