import express from 'express';
import userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  updateProfileValidation,
  changePasswordValidation,
  createAddressValidation,
  updateAddressValidation,
  requestEmailChangeValidation,
  verifyEmailChangeValidation,
} from '../validators/user.validator.js';

const router = express.Router();

// Tüm route'lar authentication gerektirir
router.use(authenticate);

// Profil route'ları
router.get('/profile', userController.getProfile);
router.put(
  '/profile',
  updateProfileValidation,
  validate,
  userController.updateProfile
);
router.put(
  '/password',
  changePasswordValidation,
  validate,
  userController.changePassword
);

// Email değişikliği route'ları
router.post(
  '/request-email-change',
  requestEmailChangeValidation,
  validate,
  userController.requestEmailChange
);
router.post(
  '/verify-email-change',
  verifyEmailChangeValidation,
  validate,
  userController.verifyEmailChange
);

// Adres route'ları
router.get('/addresses', userController.getAddresses);
router.post(
  '/addresses',
  createAddressValidation,
  validate,
  userController.createAddress
);
router.put(
  '/addresses/:id',
  updateAddressValidation,
  validate,
  userController.updateAddress
);
router.delete('/addresses/:id', userController.deleteAddress);
router.put('/addresses/:id/default', userController.setDefaultAddress);

// Mesafe hesaplama
router.post('/calculate-distance', userController.calculateDistance);

// Adres arama
router.get('/search-address', userController.searchAddress);

// Reverse geocoding
router.get('/reverse-geocode', userController.reverseGeocode);

export default router;
