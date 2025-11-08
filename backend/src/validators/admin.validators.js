import { body, param } from 'express-validator';

// Admin login validasyonu
export const adminLoginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('E-Mail ist erforderlich')
    .isEmail()
    .withMessage('Ungültige E-Mail-Adresse')
    .toLowerCase(),

  body('password')
    .notEmpty()
    .withMessage('Passwort ist erforderlich'),
];

// Admin: Kullanıcı oluşturma validasyonu
export const createUserValidation = [
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
    .toLowerCase(),

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

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive muss ein Boolean sein'),
];

// Admin: Kullanıcı güncelleme validasyonu
export const updateUserValidation = [
  param('id').isUUID().withMessage('Ungültige Benutzer-ID'),

  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Vorname darf nicht leer sein')
    .isLength({ min: 2, max: 50 })
    .withMessage('Vorname muss zwischen 2 und 50 Zeichen lang sein'),

  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Nachname darf nicht leer sein')
    .isLength({ min: 2, max: 50 })
    .withMessage('Nachname muss zwischen 2 und 50 Zeichen lang sein'),

  body('email')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('E-Mail darf nicht leer sein')
    .isEmail()
    .withMessage('Ungültige E-Mail-Adresse')
    .toLowerCase(),

  body('password')
    .optional()
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

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive muss ein Boolean sein'),
];

// Admin: Admin oluşturma validasyonu
export const createAdminValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('Vorname ist erforderlich')
    .isLength({ min: 2, max: 50 })
    .withMessage('Vorname muss zwischen 2 und 50 Zeichen lang sein'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('E-Mail ist erforderlich')
    .isEmail()
    .withMessage('Ungültige E-Mail-Adresse')
    .toLowerCase(),

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

  body('role')
    .optional()
    .isIn(['admin', 'superadmin'])
    .withMessage('Rolle muss "admin" oder "superadmin" sein'),
];

// Admin: Admin güncelleme validasyonu
export const updateAdminValidation = [
  param('id').isUUID().withMessage('Ungültige Administrator-ID'),

  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Vorname darf nicht leer sein')
    .isLength({ min: 2, max: 50 })
    .withMessage('Vorname muss zwischen 2 und 50 Zeichen lang sein'),

  body('email')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('E-Mail darf nicht leer sein')
    .isEmail()
    .withMessage('Ungültige E-Mail-Adresse')
    .toLowerCase(),

  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Passwort muss mindestens 8 Zeichen lang sein')
    .matches(/[A-Z]/)
    .withMessage('Passwort muss mindestens einen Großbuchstaben enthalten')
    .matches(/[a-z]/)
    .withMessage('Passwort muss mindestens einen Kleinbuchstaben enthalten')
    .matches(/[0-9]/)
    .withMessage('Passwort muss mindestens eine Zahl enthalten'),

  body('role')
    .optional()
    .isIn(['admin', 'superadmin'])
    .withMessage('Rolle muss "admin" oder "superadmin" sein'),
];
