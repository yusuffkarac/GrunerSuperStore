import express from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyEmailValidation,
  resendVerificationValidation,
} from '../validators/auth.validators.js';

const router = express.Router();

// Public routes
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
router.post(
  '/verify-email',
  verifyEmailValidation,
  validate,
  authController.verifyEmail
);
router.post(
  '/resend-verification',
  resendVerificationValidation,
  validate,
  authController.resendVerification
);
router.post(
  '/forgot-password',
  forgotPasswordValidation,
  validate,
  authController.forgotPassword
);
router.post(
  '/reset-password',
  resetPasswordValidation,
  validate,
  authController.resetPassword
);

// Protected routes
router.get('/me', authenticate, authController.getMe);

export default router;
