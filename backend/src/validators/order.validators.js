import { body, param } from 'express-validator';

// Sipariş oluşturma validasyonu
export const createOrderValidation = [
  body('type')
    .notEmpty()
    .withMessage('Bestelltyp ist erforderlich')
    .isIn(['pickup', 'delivery'])
    .withMessage('Ungültiger Bestelltyp'),

  body('addressId')
    .optional()
    .isUUID()
    .withMessage('Ungültige Adressen-ID'),

  body('paymentType')
    .optional()
    .isIn(['none', 'cash', 'card_on_delivery'])
    .withMessage('Ungültiger Zahlungstyp'),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notiz darf maximal 500 Zeichen lang sein'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('Bestellung muss mindestens ein Produkt enthalten'),

  body('items.*.productId')
    .notEmpty()
    .withMessage('Produkt-ID ist erforderlich')
    .isUUID()
    .withMessage('Ungültige Produkt-ID'),

  body('items.*.quantity')
    .notEmpty()
    .withMessage('Menge ist erforderlich')
    .isInt({ min: 1 })
    .withMessage('Menge muss mindestens 1 sein'),
];

// Sipariş durumu güncelleme validasyonu
export const updateOrderStatusValidation = [
  param('id').isUUID().withMessage('Ungültige Bestellungs-ID'),

  body('status')
    .notEmpty()
    .withMessage('Status ist erforderlich')
    .isIn(['pending', 'accepted', 'preparing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Ungültiger Status'),
];

// ID parametresi validasyonu
export const orderIdValidation = [
  param('id').isUUID().withMessage('Ungültige Bestellungs-ID'),
];

// Sipariş değerlendirme validasyonu
export const createReviewValidation = [
  param('id').isUUID().withMessage('Ungültige Bestellungs-ID'),

  body('rating')
    .notEmpty()
    .withMessage('Bewertung ist erforderlich')
    .isInt({ min: 1, max: 5 })
    .withMessage('Bewertung muss zwischen 1 und 5 liegen'),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Kommentar darf maximal 1000 Zeichen lang sein'),
];
