"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESPONSE_CODES = exports.HTTP_STATUS = exports.TooManyRequestsError = exports.ServiceUnavailableError = exports.DatabaseError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.TokenExpiredError = exports.UnauthorizedError = exports.BadRequestError = exports.ValidationError = exports.AppError = void 0;
const codes_1 = require("../constants/codes");
Object.defineProperty(exports, "HTTP_STATUS", { enumerable: true, get: function () { return codes_1.HTTP_STATUS; } });
Object.defineProperty(exports, "RESPONSE_CODES", { enumerable: true, get: function () { return codes_1.RESPONSE_CODES; } });
class AppError extends Error {
    constructor(message, statusCode = codes_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, code = codes_1.RESPONSE_CODES.INTERNAL_ERROR, isOperational = true, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, codes_1.HTTP_STATUS.UNPROCESSABLE_ENTITY, codes_1.RESPONSE_CODES.VALIDATION_ERROR, true, details);
    }
}
exports.ValidationError = ValidationError;
class BadRequestError extends AppError {
    constructor(message, details) {
        super(message, codes_1.HTTP_STATUS.BAD_REQUEST, codes_1.RESPONSE_CODES.BAD_REQUEST, true, details);
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, codes_1.HTTP_STATUS.UNAUTHORIZED, codes_1.RESPONSE_CODES.UNAUTHORIZED, true);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class TokenExpiredError extends AppError {
    constructor(message = 'Token expired') {
        super(message, codes_1.HTTP_STATUS.UNAUTHORIZED, codes_1.RESPONSE_CODES.TOKEN_EXPIRED, true);
    }
}
exports.TokenExpiredError = TokenExpiredError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, codes_1.HTTP_STATUS.FORBIDDEN, codes_1.RESPONSE_CODES.FORBIDDEN, true);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, codes_1.HTTP_STATUS.NOT_FOUND, codes_1.RESPONSE_CODES.NOT_FOUND, true);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message, details) {
        super(message, codes_1.HTTP_STATUS.CONFLICT, codes_1.RESPONSE_CODES.CONFLICT, true, details);
    }
}
exports.ConflictError = ConflictError;
class DatabaseError extends AppError {
    constructor(message, details) {
        super(message, codes_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, codes_1.RESPONSE_CODES.DATABASE_ERROR, true, details);
    }
}
exports.DatabaseError = DatabaseError;
class ServiceUnavailableError extends AppError {
    constructor(message = 'Service unavailable') {
        super(message, codes_1.HTTP_STATUS.SERVICE_UNAVAILABLE, codes_1.RESPONSE_CODES.SERVICE_UNAVAILABLE, true);
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests. Please try again later.', details) {
        super(message, codes_1.HTTP_STATUS.TOO_MANY_REQUESTS, codes_1.RESPONSE_CODES.TOO_MANY_REQUESTS, true, details);
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
