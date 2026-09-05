import type { ResponseCode } from '../constants/codes';
import { HTTP_STATUS, RESPONSE_CODES } from '../constants/codes';

// Standard response shape across all endpoints matching template-express
export type BaseResponse<T = unknown> = {
  success: boolean;
  message: string;
  code: ResponseCode;
  data: T | null;
  timestamp: string;
  requestId?: string;
  [key: string]: any; // Allows dual-compatibility top-level fields for existing frontends
};

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends BaseResponse<T> {
  pagination: PaginationInfo;
}

function toPlainObject(data: unknown): any {
  if (!data || typeof data !== 'object') return data;
  if (typeof (data as any).toObject === 'function') return (data as any).toObject();
  if (typeof (data as any).toJSON === 'function') return (data as any).toJSON();
  return data;
}

export class ApiResponse {
  static success<T>(data: T, message = 'Success'): BaseResponse<T> {
    const plain = toPlainObject(data);
    const base: BaseResponse<T> = {
      success: true,
      message,
      data: plain,
      code: RESPONSE_CODES.SUCCESS,
      timestamp: new Date().toISOString(),
    };

    // Dual-compatibility: merge object keys to top level so legacy clients (apple_store_cyber, dashboard_cyber)
    // expecting res.data.<field> (e.g. products, count, token, user, etc.) continue to work seamlessly.
    if (plain && typeof plain === 'object' && !Array.isArray(plain)) {
      return Object.assign({}, plain, base);
    }

    return base;
  }

  static created<T>(data: T, message = 'Resource created successfully'): BaseResponse<T> {
    const plain = toPlainObject(data);
    const base: BaseResponse<T> = {
      success: true,
      message,
      data: plain,
      code: RESPONSE_CODES.CREATED,
      timestamp: new Date().toISOString(),
    };

    if (plain && typeof plain === 'object' && !Array.isArray(plain)) {
      return Object.assign({}, plain, base);
    }

    return base;
  }

  static updated<T>(data: T, message = 'Resource updated successfully'): BaseResponse<T> {
    const plain = toPlainObject(data);
    const base: BaseResponse<T> = {
      success: true,
      message,
      data: plain,
      code: RESPONSE_CODES.UPDATED,
      timestamp: new Date().toISOString(),
    };

    if (plain && typeof plain === 'object' && !Array.isArray(plain)) {
      return Object.assign({}, plain, base);
    }

    return base;
  }

  static deleted(message = 'Resource deleted successfully'): BaseResponse<unknown> {
    return {
      success: true,
      message,
      data: null,
      code: RESPONSE_CODES.DELETED,
      timestamp: new Date().toISOString(),
    };
  }

  static error(
    message: string,
    code: ResponseCode = RESPONSE_CODES.INTERNAL_ERROR,
    data: unknown = null
  ): BaseResponse<unknown> {
    const base: BaseResponse<unknown> = {
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

  static notFound(message = 'Resource not found'): BaseResponse<unknown> {
    return this.error(message, RESPONSE_CODES.NOT_FOUND);
  }

  static badRequest(message = 'Bad request', data: unknown = null): BaseResponse<unknown> {
    return this.error(message, RESPONSE_CODES.BAD_REQUEST, data);
  }

  static validationError(message: string, data: unknown = null): BaseResponse<unknown> {
    return this.error(message, RESPONSE_CODES.VALIDATION_ERROR, data);
  }

  static unauthorized(message = 'Unauthorized'): BaseResponse<unknown> {
    return this.error(message, RESPONSE_CODES.UNAUTHORIZED);
  }

  static forbidden(message = 'Forbidden'): BaseResponse<unknown> {
    return this.error(message, RESPONSE_CODES.FORBIDDEN);
  }

  static conflict(message = 'Resource already exists', data: unknown = null): BaseResponse<unknown> {
    return this.error(message, RESPONSE_CODES.CONFLICT, data);
  }

  static databaseError(message = 'Database error', data: unknown = null): BaseResponse<unknown> {
    return this.error(message, RESPONSE_CODES.DATABASE_ERROR, data);
  }

  static serviceUnavailable(message = 'Service unavailable'): BaseResponse<unknown> {
    return this.error(message, RESPONSE_CODES.SERVICE_UNAVAILABLE);
  }

  static internalError(message = 'Internal server error', data: unknown = null): BaseResponse<unknown> {
    return this.error(message, RESPONSE_CODES.INTERNAL_ERROR, data);
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message = 'Success'
  ): PaginatedResponse<T[]> {
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const base = this.success(data, message) as PaginatedResponse<T[]>;

    base.pagination = {
      page,
      limit,
      total,
      totalPages,
    };

    return base;
  }
}

export { HTTP_STATUS };
