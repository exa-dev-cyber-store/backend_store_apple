import type { ResponseCode } from '../constants/codes';
import { HTTP_STATUS, RESPONSE_CODES } from '../constants/codes';
import type { HttpStatus } from '../constants/codes';

export class AppError extends Error {
  public statusCode: HttpStatus;
  public code: ResponseCode;
  public isOperational: boolean;
  public details?: unknown;

  constructor(
    message: string,
    statusCode: HttpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: ResponseCode = RESPONSE_CODES.INTERNAL_ERROR,
    isOperational = true,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, RESPONSE_CODES.VALIDATION_ERROR, true, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, HTTP_STATUS.BAD_REQUEST, RESPONSE_CODES.BAD_REQUEST, true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, HTTP_STATUS.UNAUTHORIZED, RESPONSE_CODES.UNAUTHORIZED, true);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token expired') {
    super(message, HTTP_STATUS.UNAUTHORIZED, RESPONSE_CODES.TOKEN_EXPIRED, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, HTTP_STATUS.FORBIDDEN, RESPONSE_CODES.FORBIDDEN, true);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND, RESPONSE_CODES.NOT_FOUND, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, HTTP_STATUS.CONFLICT, RESPONSE_CODES.CONFLICT, true, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, RESPONSE_CODES.DATABASE_ERROR, true, details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable') {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE, RESPONSE_CODES.SERVICE_UNAVAILABLE, true);
  }
}

export { HTTP_STATUS, RESPONSE_CODES };
export type { ResponseCode, HttpStatus };
