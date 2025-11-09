import express from 'express';
import notificationTemplateController from '../controllers/notification-template.controller.js';
import { authenticateAdmin } from '../middleware/admin.js';

const router = express.Router();

// Tüm notification template route'ları admin yetkisi gerektirir
router.use(authenticateAdmin);

// GET /api/admin/notification-templates - Tüm template'leri listele
router.get('/', notificationTemplateController.getAllTemplates);

// GET /api/admin/notification-templates/:name - Tek template getir
router.get('/:name', notificationTemplateController.getTemplate);

// PUT /api/admin/notification-templates/:name - Template güncelle
router.put('/:name', notificationTemplateController.updateTemplate);

// POST /api/admin/notification-templates/:name/preview - Template preview
router.post('/:name/preview', notificationTemplateController.previewTemplate);

// POST /api/admin/notification-templates/:name/reset - Template'i reset et
router.post('/:name/reset', notificationTemplateController.resetTemplate);

export default router;

