import { authenticate, optionalAuth, authorize, checkOwnership } from './auth';

export * from './auth';
export * from './errorHandler';

// Backwards compatibility aliases
export const decodeToken = () => optionalAuth;
export const checkRole = (role: string) => authorize(role);
export const checkIsUserData = (idField: string = '_id') => checkOwnership(idField);