"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTP_STATUS = exports.ApiResponse = void 0;
const codes_1 = require("../constants/codes");
Object.defineProperty(exports, "HTTP_STATUS", { enumerable: true, get: function () { return codes_1.HTTP_STATUS; } });
function toPlainObject(data) {
    if (!data || typeof data !== 'object')
        return data;
    if (typeof data.toObject === 'function')
        return data.toObject();
    if (typeof data.toJSON === 'function')
        return data.toJSON();
    return data;
}
class ApiResponse {
    static success(data, message = 'Success') {
        const plain = toPlainObject(data);
        const base = {
            success: true,
            message,
            data: plain,
            code: codes_1.RESPONSE_CODES.SUCCESS,
            timestamp: new Date().toISOString(),
        };
        // Dual-compatibility: merge object keys to top level so legacy clients (apple_store_cyber, dashboard_cyber)
        // expecting res.data.<field> (e.g. products, count, token, user, etc.) continue to work seamlessly.
        if (plain && typeof plain === 'object' && !Array.isArray(plain)) {
            return Object.assign({}, plain, base);
        }
        return base;
    }
    static created(data, message = 'Resource created successfully') {
        const plain = toPlainObject(data);
        const base = {
            success: true,
            message,
            data: plain,
            code: codes_1.RESPONSE_CODES.CREATED,
            timestamp: new Date().toISOString(),
        };
        if (plain && typeof plain === 'object' && !Array.isArray(plain)) {
            return Object.assign({}, plain, base);
        }
        return base;
    }
    static updated(data, message = 'Resource updated successfully') {
        const plain = toPlainObject(data);
        const base = {
            success: true,
            message,
            data: plain,
            code: codes_1.RESPONSE_CODES.UPDATED,
            timestamp: new Date().toISOString(),
        };
        if (plain && typeof plain === 'object' && !Array.isArray(plain)) {
            return Object.assign({}, plain, base);
        }
        return base;
    }
    static deleted(message = 'Resource deleted successfully') {
        return {
            success: true,
            message,
            data: null,
            code: codes_1.RESPONSE_CODES.DELETED,
            timestamp: new Date().toISOString(),
        };
    }
    static error(message, code = codes_1.RESPONSE_CODES.INTERNAL_ERROR, data = null) {
        const base = {
            success: false,
            message,
            data,
            code,
            timestamp: new Date().toISOString(),
        };
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            return Object.assign({}, data, base);
        }
        return base;
    }
    static notFound(message = 'Resource not found') {
        return this.error(message, codes_1.RESPONSE_CODES.NOT_FOUND);
    }
    static badRequest(message = 'Bad request', data = null) {
        return this.error(message, codes_1.RESPONSE_CODES.BAD_REQUEST, data);
    }
    static validationError(message, data = null) {
        return this.error(message, codes_1.RESPONSE_CODES.VALIDATION_ERROR, data);
    }
    static unauthorized(message = 'Unauthorized') {
        return this.error(message, codes_1.RESPONSE_CODES.UNAUTHORIZED);
    }
    static forbidden(message = 'Forbidden') {
        return this.error(message, codes_1.RESPONSE_CODES.FORBIDDEN);
    }
    static conflict(message = 'Resource already exists', data = null) {
        return this.error(message, codes_1.RESPONSE_CODES.CONFLICT, data);
    }
    static databaseError(message = 'Database error', data = null) {
        return this.error(message, codes_1.RESPONSE_CODES.DATABASE_ERROR, data);
    }
    static serviceUnavailable(message = 'Service unavailable') {
        return this.error(message, codes_1.RESPONSE_CODES.SERVICE_UNAVAILABLE);
    }
    static internalError(message = 'Internal server error', data = null) {
        return this.error(message, codes_1.RESPONSE_CODES.INTERNAL_ERROR, data);
    }
    static paginated(data, page, limit, total, message = 'Success') {
        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
        const base = this.success(data, message);
        base.pagination = {
            page,
            limit,
            total,
            totalPages,
        };
        return base;
    }
}
exports.ApiResponse = ApiResponse;
