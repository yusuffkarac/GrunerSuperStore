import express from 'express';
import cartController from '../controllers/cart.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  addToCartValidation,
  updateCartItemValidation,
  deleteCartItemValidation,
} from '../validators/cart.validators.js';

const router = express.Router();

// Tüm cart route'ları authentication gerektirir
router.use(authenticate);

// Cart routes
router.get('/', cartController.getCart);
router.post('/', addToCartValidation, validate, cartController.addToCart);
router.put(
  '/:id',
  updateCartItemValidation,
  validate,
  cartController.updateCartItem
);
router.delete(
  '/:id',
  deleteCartItemValidation,
  validate,
  cartController.deleteCartItem
);
router.delete('/', cartController.clearCart);

export default router;
