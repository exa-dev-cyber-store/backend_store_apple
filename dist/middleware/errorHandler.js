"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
const errors_1 = require("../types/errors");
const response_1 = require("../types/response");
class ErrorHandler {
    static middleware(err, req, res, _next) {
        let error;
        if (err instanceof errors_1.AppError) {
            error = err;
        }
        else if (err.name === 'CastError') {
            // Mongoose invalid ObjectId
            error = new errors_1.BadRequestError(`Invalid identifier format for field '${err.path}'`, {
                field: err.path,
                value: err.value,
            });
        }
        else if (err.name === 'ValidationError' && err.errors) {
            // Mongoose schema validation error
            const issues = Object.keys(err.errors).map((key) => ({
                field: key,
                message: err.errors[key].message,
            }));
            error = new errors_1.ValidationError('Mongoose validation failed', { errors: issues });
        }
        else if (err.name === 'MongoServerError' && err.code === 11000) {
            // Mongo duplicate key error
            const field = Object.keys(err.keyPattern || {})[0] || 'field';
            error = new errors_1.ConflictError(`Duplicate entry for ${field}`, {
                field,
                keyValue: err.keyValue,
            });
        }
        else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            error = new errors_1.AppError(err.message, 401, 'UNAUTHORIZED');
        }
        else {
            error = new errors_1.AppError(err.message || 'An unexpected error occurred', err.status || err.statusCode || 500);
        }
        // Always include details for ValidationError or if non-production
        const isDev = process.env.NODE_ENV !== 'production';
        const includeDetails = error instanceof errors_1.ValidationError || isDev;
        const response = response_1.ApiResponse.error(error.message, error.code, includeDetails ? error.details : undefined);
        res.status(error.statusCode).json(response);
    }
    static notFound(req, res) {
        const response = response_1.ApiResponse.notFound(`Route ${req.originalUrl} not found`);
        res.status(404).json(response);
    }
    static catchAsync(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
}
exports.ErrorHandler = ErrorHandler;
exports.default = ErrorHandler;
