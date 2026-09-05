import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Users, { User } from '../app/users/model';
import { ForbiddenError, UnauthorizedError } from '../types/errors';

/**
 * Authenticate middleware - verifies access token and checks session
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.trim() !== '') {
      if (!authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Invalid authorization format. Use: Bearer <token>');
      }
      const extracted = authHeader.substring(7).trim();
      if (extracted && extracted !== 'undefined' && extracted !== 'null') {
        token = extracted;
      }
    }

    // Fallback to cookie if header did not supply a valid token
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new UnauthorizedError('No authorization token provided. Please log in again.');
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.SECRET_JWT_KEY as string, { algorithms: ['HS384', 'HS256'] });
    } catch (err: any) {
      throw new UnauthorizedError(err?.message || 'Invalid or expired token');
    }

    const user: User | null = await Users.findOne({
      _id: decoded._id || decoded.userId,
      token: { $in: [token] },
    });

    if (!user) {
      throw new UnauthorizedError('Session expired or user not found');
    }

    req.user = {
      _id: user._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - attaches user if token is valid without throwing
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.SECRET_JWT_KEY as string, {
            algorithms: ['HS384', 'HS256'],
          }) as any;
          const user: User | null = await Users.findOne({
            _id: decoded._id || decoded.userId,
            token: { $in: [token] },
          });

          if (user) {
            req.user = {
              _id: user._id.toString(),
              userId: user._id.toString(),
              email: user.email,
              name: user.name,
              role: user.role,
            };
          }
        } catch {
          // Ignore token failure in optionalAuth
        }
      }
    }

    next();
  } catch {
    next();
  }
};

/**
 * Authorize middleware - checks if user has required role
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!req.user.role) {
        throw new ForbiddenError('User role not found');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new ForbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user owns the resource or is admin
 */
export const checkOwnership = (resourceUserIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const resourceUserId =
        req.params[resourceUserIdField] ||
        req.body[resourceUserIdField] ||
        req.query[resourceUserIdField];

      if (!resourceUserId) {
        throw new ForbiddenError('Resource user ID not found');
      }

      if (
        req.user._id.toString() !== resourceUserId.toString() &&
        req.user.role !== 'admin'
      ) {
        throw new ForbiddenError('Access denied. You can only access your own resources');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
