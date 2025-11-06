import express from 'express';
import settingsController from '../controllers/settings.controller.js';

const router = express.Router();

// Public route - herkes ayarları görebilir
router.get('/', settingsController.getSettings);

export default router;
