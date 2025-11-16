import express from 'express';
import magazineController from '../controllers/magazine.controller.js';

const router = express.Router();

// Public route - Kullanıcılar aktif dergileri görebilir
// GET /api/magazines/active
router.get('/active', magazineController.getActiveMagazines);

export default router;
