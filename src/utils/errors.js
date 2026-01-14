/**
 * Base application error
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400 Bad Request)
 */
class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

/**
 * Resource not found (404)
 */
class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

/**
 * Database error (503)
 */
class DatabaseError extends AppError {
  constructor(message) {
    super(message, 503, "DATABASE_ERROR");
  }
}

/**
 * Timeout error (408)
 */
class TimeoutError extends AppError {
  constructor() {
    super("Request timeout", 408, "TIMEOUT");
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  TimeoutError,
};
