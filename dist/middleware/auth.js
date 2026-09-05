"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOwnership = exports.authorize = exports.optionalAuth = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const model_1 = __importDefault(require("../app/users/model"));
const errors_1 = require("../types/errors");
/**
 * Authenticate middleware - verifies access token and checks session
 */
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        let token;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.trim() !== '') {
            if (!authHeader.startsWith('Bearer ')) {
                throw new errors_1.UnauthorizedError('Invalid authorization format. Use: Bearer <token>');
            }
            const extracted = authHeader.substring(7).trim();
            if (extracted && extracted !== 'undefined' && extracted !== 'null') {
                token = extracted;
            }
        }
        // Fallback to cookie if header did not supply a valid token
        if (!token && ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token)) {
            token = req.cookies.token;
        }
        if (!token) {
            throw new errors_1.UnauthorizedError('No authorization token provided. Please log in again.');
        }
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, process.env.SECRET_JWT_KEY, { algorithms: ['HS384', 'HS256'] });
        }
        catch (err) {
            throw new errors_1.UnauthorizedError((err === null || err === void 0 ? void 0 : err.message) || 'Invalid or expired token');
        }
        const user = yield model_1.default.findOne({
            _id: decoded._id || decoded.userId,
            token: { $in: [token] },
        });
        if (!user) {
            throw new errors_1.UnauthorizedError('Session expired or user not found');
        }
        req.user = {
            _id: user._id.toString(),
            userId: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
        };
        next();
    }
    catch (error) {
        next(error);
    }
});
exports.authenticate = authenticate;
/**
 * Optional authentication - attaches user if token is valid without throwing
 */
const optionalAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            if (token) {
                try {
                    const decoded = jsonwebtoken_1.default.verify(token, process.env.SECRET_JWT_KEY, {
                        algorithms: ['HS384', 'HS256'],
                    });
                    const user = yield model_1.default.findOne({
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
                }
                catch (_a) {
                    // Ignore token failure in optionalAuth
                }
            }
        }
        next();
    }
    catch (_b) {
        next();
    }
});
exports.optionalAuth = optionalAuth;
/**
 * Authorize middleware - checks if user has required role
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new errors_1.UnauthorizedError('Authentication required');
            }
            if (!req.user.role) {
                throw new errors_1.ForbiddenError('User role not found');
            }
            if (!allowedRoles.includes(req.user.role)) {
                throw new errors_1.ForbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.authorize = authorize;
/**
 * Check if user owns the resource or is admin
 */
const checkOwnership = (resourceUserIdField = 'userId') => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new errors_1.UnauthorizedError('Authentication required');
            }
            const resourceUserId = req.params[resourceUserIdField] ||
                req.body[resourceUserIdField] ||
                req.query[resourceUserIdField];
            if (!resourceUserId) {
                throw new errors_1.ForbiddenError('Resource user ID not found');
            }
            if (req.user._id.toString() !== resourceUserId.toString() &&
                req.user.role !== 'admin') {
                throw new errors_1.ForbiddenError('Access denied. You can only access your own resources');
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkOwnership = checkOwnership;
