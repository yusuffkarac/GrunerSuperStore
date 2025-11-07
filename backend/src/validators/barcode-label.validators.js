import { body } from 'express-validator';

export const createBarcodeLabelValidation = [
  body('name')
    .notEmpty()
    .withMessage('Ürün adı gereklidir')
    .isString()
    .withMessage('Ürün adı geçerli bir string olmalıdır')
    .isLength({ min: 1, max: 255 })
    .withMessage('Ürün adı 1-255 karakter arasında olmalıdır'),
  body('price')
    .notEmpty()
    .withMessage('Fiyat gereklidir')
    .isFloat({ min: 0 })
    .withMessage('Fiyat geçerli bir sayı olmalıdır'),
  body('unit')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Birim tipi geçerli bir string olmalıdır')
    .isLength({ max: 50 })
    .withMessage('Birim tipi maksimum 50 karakter olabilir'),
  body('barcode')
    .notEmpty()
    .withMessage('Barkod numarası gereklidir')
    .isString()
    .withMessage('Barkod numarası geçerli bir string olmalıdır')
    .isLength({ min: 1, max: 100 })
    .withMessage('Barkod numarası 1-100 karakter arasında olmalıdır'),
];

export const updateBarcodeLabelValidation = [
  body('name')
    .optional()
    .isString()
    .withMessage('Ürün adı geçerli bir string olmalıdır')
    .isLength({ min: 1, max: 255 })
    .withMessage('Ürün adı 1-255 karakter arasında olmalıdır'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fiyat geçerli bir sayı olmalıdır'),
  body('unit')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Birim tipi geçerli bir string olmalıdır')
    .isLength({ max: 50 })
    .withMessage('Birim tipi maksimum 50 karakter olabilir'),
  body('barcode')
    .optional()
    .isString()
    .withMessage('Barkod numarası geçerli bir string olmalıdır')
    .isLength({ min: 1, max: 100 })
    .withMessage('Barkod numarası 1-100 karakter arasında olmalıdır'),
];

export const getBarcodeLabelsByIdsValidation = [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('En az bir etiket ID\'si gereklidir'),
];

export const bulkDeleteBarcodeLabelValidation = [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('En az bir etiket ID\'si gereklidir'),
];
