import { body, param } from 'express-validator';

// Profil güncelleme validasyonu
export const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Vorname darf nicht leer sein'),
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Nachname darf nicht leer sein'),
  body('phone')
    .optional()
    .trim()
    .matches(/^(\+49|0)[1-9]\d{1,14}$/)
    .withMessage('Ungültige Telefonnummer'),
];

// Şifre değiştirme validasyonu
export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Aktuelles Passwort ist erforderlich'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Neues Passwort muss mindestens 6 Zeichen lang sein')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Neues Passwort muss mindestens einen Kleinbuchstaben, einen Großbuchstaben und eine Zahl enthalten'
    ),
];

// Adres oluşturma validasyonu
export const createAddressValidation = [
  body('title').trim().notEmpty().withMessage('Adresstitel ist erforderlich'),
  body('street').trim().notEmpty().withMessage('Straße ist erforderlich'),
  body('houseNumber')
    .trim()
    .notEmpty()
    .withMessage('Hausnummer ist erforderlich'),
  body('addressLine2').optional().trim(),
  body('district').optional().trim(),
  body('postalCode')
    .trim()
    .notEmpty()
    .withMessage('PLZ ist erforderlich')
    .matches(/^\d{5}$/)
    .withMessage('PLZ muss 5 Ziffern haben'),
  body('city').trim().notEmpty().withMessage('Stadt ist erforderlich'),
  body('state').trim().notEmpty().withMessage('Bundesland ist erforderlich'),
  body('description').optional().trim(),
  body('isDefault').optional().isBoolean(),
];

// Adres güncelleme validasyonu
export const updateAddressValidation = [
  param('id').isUUID().withMessage('Ungültige Adress-ID'),
  body('title').optional().trim().notEmpty(),
  body('street').optional().trim().notEmpty(),
  body('houseNumber').optional().trim().notEmpty(),
  body('addressLine2').optional().trim(),
  body('district').optional().trim(),
  body('postalCode')
    .optional()
    .trim()
    .matches(/^\d{5}$/)
    .withMessage('PLZ muss 5 Ziffern haben'),
  body('city').optional().trim().notEmpty(),
  body('state').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('isDefault').optional().isBoolean(),
];
