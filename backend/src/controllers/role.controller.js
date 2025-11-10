import * as roleService from '../services/role.service.js';

// ===================================
// ROLE CONTROLLERS
// ===================================

/**
 * Tüm rolleri listele
 * GET /admin/roles
 */
export const getRoles = async (req, res, next) => {
  try {
    const roles = await roleService.getAllRoles();
    res.json(roles);
  } catch (error) {
    next(error);
  }
};

/**
 * Tek bir rolün detayını getir
 * GET /admin/roles/:id
 */
export const getRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const role = await roleService.getRoleById(id);
    res.json(role);
  } catch (error) {
    next(error);
  }
};

/**
 * Yeni rol oluştur
 * POST /admin/roles
 */
export const createRole = async (req, res, next) => {
  try {
    const role = await roleService.createRole(req.body);
    res.status(201).json(role);
  } catch (error) {
    next(error);
  }
};

/**
 * Rolü güncelle
 * PATCH /admin/roles/:id
 */
export const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const role = await roleService.updateRole(id, req.body);
    res.json(role);
  } catch (error) {
    next(error);
  }
};

/**
 * Rolü sil
 * DELETE /admin/roles/:id
 */
export const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await roleService.deleteRole(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ===================================
// PERMISSION CONTROLLERS
// ===================================

/**
 * Tüm izinleri listele
 * GET /admin/permissions
 */
export const getPermissions = async (req, res, next) => {
  try {
    const permissions = await roleService.getAllPermissions();
    res.json(permissions);
  } catch (error) {
    next(error);
  }
};

/**
 * Yeni izin oluştur
 * POST /admin/permissions
 */
export const createPermission = async (req, res, next) => {
  try {
    const permission = await roleService.createPermission(req.body);
    res.status(201).json(permission);
  } catch (error) {
    next(error);
  }
};

/**
 * İzni güncelle
 * PATCH /admin/permissions/:id
 */
export const updatePermission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const permission = await roleService.updatePermission(id, req.body);
    res.json(permission);
  } catch (error) {
    next(error);
  }
};

/**
 * İzni sil
 * DELETE /admin/permissions/:id
 */
export const deletePermission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await roleService.deletePermission(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin'e rol ata
 * POST /admin/:adminId/assign-role
 */
export const assignRole = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { roleId } = req.body;
    const admin = await roleService.assignRoleToAdmin(adminId, roleId);
    res.json(admin);
  } catch (error) {
    next(error);
  }
};
