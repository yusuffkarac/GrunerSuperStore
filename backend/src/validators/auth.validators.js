import { body } from 'express-validator';

// Kayıt validasyonu
export const registerValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('Vorname ist erforderlich')
    .isLength({ min: 2, max: 50 })
    .withMessage('Vorname muss zwischen 2 und 50 Zeichen lang sein'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Nachname ist erforderlich')
    .isLength({ min: 2, max: 50 })
    .withMessage('Nachname muss zwischen 2 und 50 Zeichen lang sein'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('E-Mail ist erforderlich')
    .isEmail()
    .withMessage('Ungültige E-Mail-Adresse')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Passwort ist erforderlich')
    .isLength({ min: 8 })
    .withMessage('Passwort muss mindestens 8 Zeichen lang sein')
    .matches(/[A-Z]/)
    .withMessage('Passwort muss mindestens einen Großbuchstaben enthalten')
    .matches(/[a-z]/)
    .withMessage('Passwort muss mindestens einen Kleinbuchstaben enthalten')
    .matches(/[0-9]/)
    .withMessage('Passwort muss mindestens eine Zahl enthalten'),

  body('phone')
    .optional()
    .trim()
    .matches(/^(\+49|0)[1-9]\d{1,14}$/)
    .withMessage('Ungültige Telefonnummer'),
];

// Login validasyonu
export const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('E-Mail ist erforderlich')
    .isEmail()
    .withMessage('Ungültige E-Mail-Adresse')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Passwort ist erforderlich'),
];

// Forgot password validasyonu
export const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('E-Mail ist erforderlich')
    .isEmail()
    .withMessage('Ungültige E-Mail-Adresse')
    .normalizeEmail(),
];

// Reset password validasyonu
export const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token ist erforderlich'),

  body('password')
    .notEmpty()
    .withMessage('Passwort ist erforderlich')
    .isLength({ min: 8 })
    .withMessage('Passwort muss mindestens 8 Zeichen lang sein')
    .matches(/[A-Z]/)
    .withMessage('Passwort muss mindestens einen Großbuchstaben enthalten')
    .matches(/[a-z]/)
    .withMessage('Passwort muss mindestens einen Kleinbuchstaben enthalten')
    .matches(/[0-9]/)
    .withMessage('Passwort muss mindestens eine Zahl enthalten'),
];

// Email verification validasyonu
export const verifyEmailValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('E-Mail ist erforderlich')
    .isEmail()
    .withMessage('Ungültige E-Mail-Adresse')
    .normalizeEmail(),

  body('code')
    .trim()
    .notEmpty()
    .withMessage('Bestätigungscode ist erforderlich')
    .isLength({ min: 6, max: 6 })
    .withMessage('Bestätigungscode muss 6 Zeichen lang sein')
    .matches(/^\d{6}$/)
    .withMessage('Bestätigungscode muss 6 Ziffern sein'),
];

// Resend verification validasyonu
export const resendVerificationValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('E-Mail ist erforderlich')
    .isEmail()
    .withMessage('Ungültige E-Mail-Adresse')
    .normalizeEmail(),
];
