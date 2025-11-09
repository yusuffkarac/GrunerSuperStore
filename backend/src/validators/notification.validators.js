import { body, param } from 'express-validator';

// Custom validator: Relative path veya URL kontrolü
const isValidUrlOrPath = (value) => {
  // Boş string veya null/undefined ise geçerli (optional)
  if (!value || value.trim() === '') return true;
  const trimmed = value.trim();
  // Relative path kontrolü (/, /path, /path/to/page)
  if (trimmed.startsWith('/')) {
    return trimmed.length > 1 && trimmed.length <= 500;
  }
  // Absolute URL kontrolü
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
};

// Bildirim oluşturma validasyonu (admin)
export const createNotificationValidation = [
  body('title')
    .notEmpty()
    .withMessage('Titel ist erforderlich')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Titel muss zwischen 1 und 200 Zeichen lang sein'),

  body('message')
    .notEmpty()
    .withMessage('Nachricht ist erforderlich')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Nachricht muss zwischen 1 und 1000 Zeichen lang sein'),

  body('type')
    .optional()
    .isIn(['info', 'success', 'warning', 'error'])
    .withMessage('Ungültiger Benachrichtigungstyp'),

  body('actionUrl')
    .optional()
    .custom(isValidUrlOrPath)
    .withMessage('Ungültige URL oder Pfad'),

  body('userIds')
    .optional({ nullable: true })
    .custom((value) => {
      // null, undefined veya array olmalı
      if (value === null || value === undefined) return true;
      return Array.isArray(value);
    })
    .withMessage('userIds muss ein Array sein oder null'),

  body('userIds.*')
    .optional()
    .isUUID()
    .withMessage('Ungültige Benutzer-ID'),

  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata muss ein Objekt sein'),
];

// Bildirim ID validasyonu
export const notificationIdValidation = [
  param('id').isUUID().withMessage('Ungültige Benachrichtigungs-ID'),
];

