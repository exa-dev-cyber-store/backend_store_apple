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
Object.defineProperty(exports, "__esModule", { value: true });
exports.bool = void 0;
exports.numeric = numeric;
exports.file = file;
exports.validate = validate;
const zod_1 = require("zod");
const errors_1 = require("../types/errors");
const INVALID = Symbol('invalid-coercion');
function toNumber(value) {
    if (typeof value === 'number') {
        return Number.isNaN(value) ? INVALID : value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? INVALID : parsed;
    }
    return INVALID;
}
function toBoolean(value) {
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
function numeric(min, max) {
    let numberType = zod_1.z.number();
    if (min !== undefined) {
        numberType = numberType.min(min);
    }
    if (max !== undefined) {
        numberType = numberType.max(max);
    }
    return zod_1.z.preprocess(toNumber, numberType);
}
/**
 * Boolean field with string -> boolean coercion ('true'/'1'/'yes'/'on' ...).
 */
const bool = () => zod_1.z.preprocess(toBoolean, zod_1.z.boolean());
exports.bool = bool;
function isFileLike(value) {
    return (typeof value === 'object' &&
        value !== null &&
        typeof value.mimetype === 'string' &&
        typeof value.size === 'number');
}
/**
 * File field for multer uploads.
 */
function file(rule = {}) {
    const normalized = zod_1.z.preprocess((value) => {
        if (Array.isArray(value)) {
            return value;
        }
        return value === undefined || value === null ? [] : [value];
    }, zod_1.z.array(zod_1.z.any()));
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
    return checked.transform((files) => { var _a; return (rule.multiple ? files : (_a = files[0]) !== null && _a !== void 0 ? _a : null); });
}
function sourceOf(req, source) {
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
function valueAtPath(root, path) {
    let current = root;
    for (const segment of path) {
        if (current === null || typeof current !== 'object') {
            return undefined;
        }
        current = current[segment];
    }
    return current;
}
/**
 * Creates an Express middleware that validates one or more sources with Zod.
 * On failure it throws a ValidationError carrying every field issue; on
 * success it exposes the coerced values on `req.validated`.
 */
function validate(schema) {
    return (req, _res, next) => __awaiter(this, void 0, void 0, function* () {
        try {
            const issues = [];
            const validated = {};
            for (const source of ['body', 'query', 'params', 'files']) {
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
                            value: valueAtPath(raw, issue.path),
                        });
                    }
                }
                else {
                    validated[source] = parsed.data;
                }
            }
            if (issues.length > 0) {
                throw new errors_1.ValidationError('Validation failed', { errors: issues });
            }
            req.validated = validated;
            next();
        }
        catch (error) {
            next(error);
        }
    });
}
