import express from 'express';
import emailController from '../controllers/email.controller.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

// Tüm email route'ları admin auth gerektiriyor
router.use(adminAuth);

// Test mail gönder
router.post('/test', emailController.sendTestEmail);

// Email loglarını getir
router.get('/logs', emailController.getEmailLogs);

// Queue istatistikleri
router.get('/queue-stats', emailController.getQueueStats);

// Başarısız job'ları yeniden dene
router.post('/retry-failed', emailController.retryFailedJobs);

// Kuyruğu temizle
router.post('/clean-queue', emailController.cleanQueue);

export default router;
