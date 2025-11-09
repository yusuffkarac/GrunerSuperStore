import express from 'express';
import templateController from '../controllers/template.controller.js';
import { authenticateAdmin } from '../middleware/admin.js';

const router = express.Router();

// Tüm template route'ları admin yetkisi gerektirir
router.use(authenticateAdmin);

// GET /api/admin/templates - Tüm template'leri listele
router.get('/', templateController.getAllTemplates);

// GET /api/admin/templates/:name - Tek template getir
router.get('/:name', templateController.getTemplate);

// PUT /api/admin/templates/:name - Template güncelle
router.put('/:name', templateController.updateTemplate);

// POST /api/admin/templates/:name/preview - Template preview
router.post('/:name/preview', templateController.previewTemplate);

// POST /api/admin/templates/:name/reset - Template'i reset et
router.post('/:name/reset', templateController.resetTemplate);

// POST /api/admin/templates/:name/test - Test maili gönder
router.post('/:name/test', templateController.sendTestEmail);

export default router;

