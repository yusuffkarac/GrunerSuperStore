import express from 'express';
import notificationTemplateController from '../controllers/notification-template.controller.js';
import { authenticateAdmin, requirePermission } from '../middleware/admin.js';

const router = express.Router();

// Tüm notification template route'ları admin yetkisi gerektirir
router.use(authenticateAdmin);

// GET /api/admin/notification-templates - Tüm template'leri listele
router.get('/', requirePermission('notification_template_management_view'), notificationTemplateController.getAllTemplates);

// GET /api/admin/notification-templates/:name - Tek template getir
router.get('/:name', requirePermission('notification_template_management_view'), notificationTemplateController.getTemplate);

// PUT /api/admin/notification-templates/:name - Template güncelle
router.put('/:name', requirePermission('notification_template_management_edit'), notificationTemplateController.updateTemplate);

// POST /api/admin/notification-templates/:name/preview - Template preview
router.post('/:name/preview', requirePermission('notification_template_management_view'), notificationTemplateController.previewTemplate);

// POST /api/admin/notification-templates/:name/reset - Template'i reset et
router.post('/:name/reset', requirePermission('notification_template_management_edit'), notificationTemplateController.resetTemplate);

export default router;

