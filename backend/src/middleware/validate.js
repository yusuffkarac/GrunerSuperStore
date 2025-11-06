import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors.js';

// Validation sonuçlarını kontrol et
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validierungsfehler',
      errors: formattedErrors,
    });
  }

  next();
};
