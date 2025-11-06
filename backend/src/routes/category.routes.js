import express from 'express';
import categoryController from '../controllers/category.controller.js';

const router = express.Router();

// Public routes
router.get('/', categoryController.getCategories);

export default router;
