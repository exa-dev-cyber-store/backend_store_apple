import type { NextFunction, Request, Response } from 'express';
import { AppError, ConflictError, BadRequestError, ValidationError } from '../types/errors';
import { ApiResponse } from '../types/response';

export class ErrorHandler {
  static middleware(err: any, req: Request, res: Response, _next: NextFunction): void {
    let error: AppError;

    if (err instanceof AppError) {
      error = err;
    } else if (err.name === 'CastError') {
      // Mongoose invalid ObjectId
      error = new BadRequestError(`Invalid identifier format for field '${err.path}'`, {
        field: err.path,
        value: err.value,
      });
    } else if (err.name === 'ValidationError' && err.errors) {
      // Mongoose schema validation error
      const issues = Object.keys(err.errors).map((key) => ({
        field: key,
        message: err.errors[key].message,
      }));
      error = new ValidationError('Mongoose validation failed', { errors: issues });
    } else if (err.name === 'MongoServerError' && err.code === 11000) {
      // Mongo duplicate key error
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      error = new ConflictError(`Duplicate entry for ${field}`, {
        field,
        keyValue: err.keyValue,
      });
    } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      error = new AppError(err.message, 401, 'UNAUTHORIZED');
    } else {
      error = new AppError(
        err.message || 'An unexpected error occurred',
        err.status || err.statusCode || 500
      );
    }

    // Always include details for ValidationError or if non-production
    const isDev = process.env.NODE_ENV !== 'production';
    const includeDetails = error instanceof ValidationError || isDev;

    const response = ApiResponse.error(
      error.message,
      error.code,
      includeDetails ? error.details : undefined
    );

    res.status(error.statusCode).json(response);
  }

  static notFound(req: Request, res: Response): void {
    const response = ApiResponse.notFound(`Route ${req.originalUrl} not found`);
    res.status(404).json(response);
  }

  static catchAsync(fn: (req: Request, res: Response, next: NextFunction) => unknown) {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

export default ErrorHandler;
