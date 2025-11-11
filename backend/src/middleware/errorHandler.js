import { AppError } from '../utils/errors.js';

// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  // CORS başlıklarını error handler'da da ekle
  const origin = req.headers.origin;
  if (origin && (process.env.NODE_ENV !== 'production' || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  }

  // Log hatayı
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
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
      ...(!isProduction && { stack: err.stack }),
    });
  }

  // Prisma hataları
  if (err.name === 'PrismaClientKnownRequestError' || err.code?.startsWith('P')) {
    return handlePrismaError(err, res);
  }

  // Raw SQL hataları (kolon bulunamadığında)
  if (err.message?.includes('column') && err.message?.includes('does not exist')) {
    console.error('❌ Database column hatası:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Datenbankfehler: Spalte fehlt. Bitte Migrationen ausführen.',
      ...(process.env.NODE_ENV !== 'production' && { 
        detail: err.message,
        hint: 'Migration çalıştırın: npm run migrate'
      }),
    });
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
  const message = isProduction
    ? 'Ein Fehler ist aufgetreten'
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(!isProduction && {
      stack: err.stack,
      error: err,
    }),
  });
};

// Prisma hatalarını işle
const handlePrismaError = (err, res) => {
  // Hata detaylarını logla
  console.error('❌ Prisma Error:', {
    code: err.code,
    message: err.message,
    meta: err.meta,
  });

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

    case 'P1001':
      // Can't reach database server
      return res.status(500).json({
        success: false,
        message: 'Datenbankverbindung fehlgeschlagen',
      });

    case 'P1008':
      // Operations timed out
      return res.status(500).json({
        success: false,
        message: 'Datenbankanfrage Zeitüberschreitung',
      });

    default:
      return res.status(500).json({
        success: false,
        message: 'Datenbankfehler',
        ...(process.env.NODE_ENV !== 'production' && { 
          code: err.code,
          message: err.message,
          meta: err.meta,
        }),
      });
  }
};

// 404 handler
export const notFoundHandler = (req, res) => {
  // CORS başlıklarını 404 handler'da da ekle
  const origin = req.headers.origin;
  if (origin && (process.env.NODE_ENV !== 'production' || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  }

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
