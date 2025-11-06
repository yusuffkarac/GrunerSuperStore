// Custom error classes

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Ungültige Eingabedaten') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Nicht autorisiert') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Zugriff verweigert') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Ressource nicht gefunden') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Ressource existiert bereits') {
    super(message, 409);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.') {
    super(message, 429);
  }
}
