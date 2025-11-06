import { body, param } from 'express-validator';

// Sepete ürün ekleme validasyonu
export const addToCartValidation = [
  body('productId')
    .notEmpty()
    .withMessage('Produkt-ID ist erforderlich')
    .isUUID()
    .withMessage('Ungültige Produkt-ID'),

  body('quantity')
    .notEmpty()
    .withMessage('Menge ist erforderlich')
    .isInt({ min: 1 })
    .withMessage('Menge muss mindestens 1 sein'),
];

// Sepet miktarı güncelleme validasyonu
export const updateCartItemValidation = [
  param('id')
    .notEmpty()
    .withMessage('Warenkorb-ID ist erforderlich')
    .isUUID()
    .withMessage('Ungültige Warenkorb-ID'),

  body('quantity')
    .notEmpty()
    .withMessage('Menge ist erforderlich')
    .isInt({ min: 1 })
    .withMessage('Menge muss mindestens 1 sein'),
];

// Sepetten ürün silme validasyonu
export const deleteCartItemValidation = [
  param('id')
    .notEmpty()
    .withMessage('Warenkorb-ID ist erforderlich')
    .isUUID()
    .withMessage('Ungültige Warenkorb-ID'),
];
