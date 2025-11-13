import express from 'express';
import activityLogController from '../controllers/activityLog.controller.js';
import { authenticateAdmin } from '../middleware/admin.js';

const router = express.Router();

// Tüm route'lar admin authentication gerektirir
router.use(authenticateAdmin);

// GET /api/admin/logs - Log listesi
router.get('/', activityLogController.getLogs);

// GET /api/admin/logs/stats - İstatistikler
router.get('/stats', activityLogController.getLogStats);

// GET /api/admin/logs/:id - Log detayı
router.get('/:id', activityLogController.getLogById);

export default router;

