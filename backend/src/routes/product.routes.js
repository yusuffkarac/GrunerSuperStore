import express from 'express';
import productController from '../controllers/product.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public routes (optional auth - token varsa req.user set edilir)
router.get('/', optionalAuth, productController.getProducts);
router.get('/featured', optionalAuth, productController.getFeaturedProducts);
router.get('/bestsellers', optionalAuth, productController.getBestSellers);
router.get('/slug/:slug', optionalAuth, productController.getProductBySlug);
router.get('/:id', optionalAuth, productController.getProductById);

export default router;
