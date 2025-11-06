import { AppError } from '../utils/errors.js';

// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  // Log hatayı
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  } else {
    // Production'da sadece önemli hataları logla
    if (!err.isOperational) {
      console.error('❌ Unexpected Error:', err);
    }
  }

  // AppError ise (bizim fırlattığımız hatalar)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Prisma hataları
  if (err.name === 'PrismaClientKnownRequestError') {
    return handlePrismaError(err, res);
  }

  // Validation hataları (express-validator)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validierungsfehler',
      errors: err.errors,
    });
  }

  // JWT hataları
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Ungültiger Token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token abgelaufen',
    });
  }

  // Diğer tüm hatalar (beklenmeyen)
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Ein Fehler ist aufgetreten'
      : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err,
    }),
  });
};

// Prisma hatalarını işle
const handlePrismaError = (err, res) => {
  switch (err.code) {
    case 'P2002':
      // Unique constraint hatası
      const field = err.meta?.target?.[0] || 'field';
      return res.status(409).json({
        success: false,
        message: `${field} bereits vorhanden`,
      });

    case 'P2025':
      // Record not found
      return res.status(404).json({
        success: false,
        message: 'Ressource nicht gefunden',
      });

    case 'P2003':
      // Foreign key constraint
      return res.status(400).json({
        success: false,
        message: 'Ungültige Referenz',
      });

    default:
      return res.status(500).json({
        success: false,
        message: 'Datenbankfehler',
        ...(process.env.NODE_ENV === 'development' && { code: err.code }),
      });
  }
};

// 404 handler
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint nicht gefunden',
    path: req.originalUrl,
  });
};

// Async handler wrapper (try-catch'i otomatikleştirir)
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
