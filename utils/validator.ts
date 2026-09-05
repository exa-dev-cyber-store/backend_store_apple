import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '../types/errors';

declare global {
  namespace Express {
    interface Request {
      validated?: Record<string, any>;
    }
  }
}

export type ValidatedSource = 'body' | 'query' | 'params' | 'files';
export type ZodSchema = z.ZodTypeAny;

export interface ValidateSchema {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  files?: ZodSchema;
}

export interface ValidationIssue {
  field: string;
  message: string;
  value?: unknown;
}

export interface FileRule {
  allowedMime?: string[];
  maxBytes?: number;
  multiple?: boolean;
}

const INVALID = Symbol('invalid-coercion');

function toNumber(value: unknown): number | typeof INVALID {
  if (typeof value === 'number') {
    return Number.isNaN(value) ? INVALID : value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? INVALID : parsed;
  }
  return INVALID;
}

function toBoolean(value: unknown): boolean | typeof INVALID {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (['1', 'true', 'yes', 'on'].includes(value.toLowerCase())) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(value.toLowerCase())) {
      return false;
    }
  }
  return INVALID;
}

/**
 * Number field with string -> number coercion (query/params friendly).
 * Rejects empty strings / null / NaN instead of coercing them to 0.
 *   numeric()            -> any valid number
 *   numeric(1)           -> valid number >= 1
 *   numeric(1, 100)      -> valid number within range
 * Chain `.optional()` as usual.
 */
export function numeric(min?: number, max?: number): ZodSchema {
  let numberType = z.number();
  if (min !== undefined) {
    numberType = numberType.min(min);
  }
  if (max !== undefined) {
    numberType = numberType.max(max);
  }
  return z.preprocess(toNumber, numberType);
}

/**
 * Boolean field with string -> boolean coercion ('true'/'1'/'yes'/'on' ...).
 */
export const bool = (): ZodSchema => z.preprocess(toBoolean, z.boolean());

function isFileLike(value: unknown): value is { mimetype: string; size: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { mimetype?: unknown }).mimetype === 'string' &&
    typeof (value as { size?: unknown }).size === 'number'
  );
}

/**
 * File field for multer uploads.
 */
export function file(rule: FileRule = {}): ZodSchema {
  const normalized = z.preprocess(
    (value) => {
      if (Array.isArray(value)) {
        return value;
      }
      return value === undefined || value === null ? [] : [value];
    },
    z.array(z.any() as z.ZodType<unknown>)
  );

  const checked = normalized.superRefine((files, ctx) => {
    if (rule.multiple && files.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'must contain at least one file' });
      return;
    }

    if (!rule.multiple && files.length > 1) {
      ctx.addIssue({ code: 'custom', message: 'accepts a single file' });
      return;
    }

    for (const f of files) {
      if (!isFileLike(f)) {
        ctx.addIssue({ code: 'custom', message: 'must be a valid file upload' });
        continue;
      }
      if (rule.allowedMime && !rule.allowedMime.includes(f.mimetype)) {
        ctx.addIssue({ code: 'custom', message: `has an unsupported file type: ${f.mimetype}` });
      }
      if (rule.maxBytes !== undefined && f.size > rule.maxBytes) {
        ctx.addIssue({ code: 'custom', message: `must be smaller than ${rule.maxBytes} bytes` });
      }
    }
  });

  return checked.transform((files) => (rule.multiple ? files : files[0] ?? null));
}

function sourceOf(req: Request, source: ValidatedSource): unknown {
  if (source === 'body') {
    return req.body || {};
  }
  if (source === 'query') {
    return req.query || {};
  }
  if (source === 'params') {
    return req.params || {};
  }
  return req.files || {};
}

function valueAtPath(root: unknown, path: (string | number)[]): unknown {
  let current: unknown = root;
  for (const segment of path) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
}

/**
 * Creates an Express middleware that validates one or more sources with Zod.
 * On failure it throws a ValidationError carrying every field issue; on
 * success it exposes the coerced values on `req.validated`.
 */
export function validate(schema: ValidateSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const issues: ValidationIssue[] = [];
      const validated: Record<string, unknown> = {};

      for (const source of ['body', 'query', 'params', 'files'] as const) {
        const rule = schema[source];
        if (!rule) {
          continue;
        }

        const raw = sourceOf(req, source);
        const parsed = rule.safeParse(raw);

        if (!parsed.success) {
          for (const issue of parsed.error.issues) {
            issues.push({
              field: `${source}.${issue.path.join('.')}`,
              message: issue.message,
              value: valueAtPath(raw, issue.path as (string | number)[]),
            });
          }
        } else {
          validated[source] = parsed.data;
        }
      }

      if (issues.length > 0) {
        throw new ValidationError('Validation failed', { errors: issues });
      }

      (req as Request & { validated: typeof validated }).validated = validated;
      next();
    } catch (error) {
      next(error);
    }
  };
}
