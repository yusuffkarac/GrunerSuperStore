import express from 'express';
import faqController from '../controllers/faq.controller.js';

const router = express.Router();

// Public route - Kullanıcılar aktif FAQ'ları görebilir
// GET /api/faqs/active
router.get('/active', faqController.getActiveFAQs);

export default router;

