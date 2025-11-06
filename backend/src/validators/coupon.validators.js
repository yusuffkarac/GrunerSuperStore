import { body } from 'express-validator';

export const validateCouponValidation = [
  body('code')
    .notEmpty()
    .withMessage('Kupon kodu gereklidir')
    .isString()
    .withMessage('Kupon kodu geçerli bir string olmalıdır'),
  body('subtotal')
    .notEmpty()
    .withMessage('Sepet tutarı gereklidir')
    .isFloat({ min: 0 })
    .withMessage('Sepet tutarı geçerli bir sayı olmalıdır'),
  body('cartItems')
    .isArray()
    .withMessage('Sepet ürünleri bir array olmalıdır'),
];

export const createCouponValidation = [
  body('code')
    .notEmpty()
    .withMessage('Kupon kodu gereklidir')
    .isString()
    .withMessage('Kupon kodu geçerli bir string olmalıdır')
    .isLength({ min: 3, max: 50 })
    .withMessage('Kupon kodu 3-50 karakter arasında olmalıdır'),
  body('type')
    .notEmpty()
    .withMessage('Kupon tipi gereklidir')
    .isIn(['PERCENTAGE', 'FIXED_AMOUNT'])
    .withMessage('Kupon tipi PERCENTAGE veya FIXED_AMOUNT olmalıdır'),
  body('discountPercent')
    .if(body('type').equals('PERCENTAGE'))
    .notEmpty()
    .withMessage('İndirim yüzdesi gereklidir')
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('İndirim yüzdesi 0.01-100 arasında olmalıdır'),
  body('discountAmount')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => {
      // Eğer tip FIXED_AMOUNT ise, discountAmount zorunlu
      if (req.body.type === 'FIXED_AMOUNT') {
        if (!value || value === null || value === '') {
          throw new Error('İndirim tutarı gereklidir');
        }
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0.01) {
          throw new Error('İndirim tutarı 0.01\'den büyük olmalıdır');
        }
      }
      // PERCENTAGE tipinde discountAmount null olabilir
      return true;
    }),
  body('startDate')
    .notEmpty()
    .withMessage('Başlangıç tarihi gereklidir')
    .isISO8601()
    .withMessage('Başlangıç tarihi geçerli bir tarih olmalıdır'),
  body('endDate')
    .notEmpty()
    .withMessage('Bitiş tarihi gereklidir')
    .isISO8601()
    .withMessage('Bitiş tarihi geçerli bir tarih olmalıdır'),
];

export const updateCouponValidation = [
  body('code')
    .optional()
    .isString()
    .withMessage('Kupon kodu geçerli bir string olmalıdır')
    .isLength({ min: 3, max: 50 })
    .withMessage('Kupon kodu 3-50 karakter arasında olmalıdır'),
  body('type')
    .optional()
    .isIn(['PERCENTAGE', 'FIXED_AMOUNT'])
    .withMessage('Kupon tipi PERCENTAGE veya FIXED_AMOUNT olmalıdır'),
  body('discountPercent')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('İndirim yüzdesi 0.01-100 arasında olmalıdır'),
  body('discountAmount')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0.01 })
    .withMessage('İndirim tutarı 0.01\'den büyük olmalıdır'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Başlangıç tarihi geçerli bir tarih olmalıdır'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Bitiş tarihi geçerli bir tarih olmalıdır'),
];

