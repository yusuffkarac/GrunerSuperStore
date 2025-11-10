import express from 'express';
import templateController from '../controllers/template.controller.js';
import { authenticateAdmin, requirePermission } from '../middleware/admin.js';

const router = express.Router();

// Tüm template route'ları admin yetkisi gerektirir
router.use(authenticateAdmin);

// GET /api/admin/templates - Tüm template'leri listele
router.get('/', requirePermission('email_template_management_view'), templateController.getAllTemplates);

// GET /api/admin/templates/:name - Tek template getir
router.get('/:name', requirePermission('email_template_management_view'), templateController.getTemplate);

// PUT /api/admin/templates/:name - Template güncelle
router.put('/:name', requirePermission('email_template_management_edit'), templateController.updateTemplate);

// POST /api/admin/templates/:name/preview - Template preview
router.post('/:name/preview', requirePermission('email_template_management_view'), templateController.previewTemplate);

// POST /api/admin/templates/:name/reset - Template'i reset et
router.post('/:name/reset', requirePermission('email_template_management_edit'), templateController.resetTemplate);

// POST /api/admin/templates/:name/test - Test maili gönder
router.post('/:name/test', requirePermission('email_template_management_edit'), templateController.sendTestEmail);

export default router;

