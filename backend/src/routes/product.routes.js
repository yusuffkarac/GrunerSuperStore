import express from 'express';
import productController from '../controllers/product.controller.js';

const router = express.Router();

// Public routes
router.get('/', productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/bestsellers', productController.getBestSellers);
router.get('/slug/:slug', productController.getProductBySlug);
router.get('/:id', productController.getProductById);

export default router;
