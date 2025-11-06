import { param } from 'express-validator';

// Ürün ID validasyonu
export const productIdValidation = [
  param('productId').isUUID().withMessage('Ungültige Produkt-ID'),
];
