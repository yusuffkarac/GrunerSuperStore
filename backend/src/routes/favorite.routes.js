import express from 'express';
import favoriteController from '../controllers/favorite.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { productIdValidation } from '../validators/favorite.validators.js';

const router = express.Router();

// Tüm route'lar authentication gerektirir
router.use(authenticate);

// GET /api/favorites - Favori ürünleri listele
router.get('/', favoriteController.getFavorites);

// GET /api/favorites/ids - Favori ID'lerini getir
router.get('/ids', favoriteController.getFavoriteIds);

// GET /api/favorites/check/:productId - Ürün favorilerde mi kontrol et
router.get(
  '/check/:productId',
  productIdValidation,
  validate,
  favoriteController.checkFavorite
);

// POST /api/favorites/:productId - Favorilere ekle
router.post(
  '/:productId',
  productIdValidation,
  validate,
  favoriteController.addFavorite
);

// DELETE /api/favorites/:productId - Favorilerden çıkar
router.delete(
  '/:productId',
  productIdValidation,
  validate,
  favoriteController.removeFavorite
);

export default router;
