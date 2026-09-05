"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voucherIdParamSchema = exports.validateVoucherSchema = exports.updateVoucherSchema = exports.createVoucherSchema = void 0;
const zod_1 = require("zod");
exports.createVoucherSchema = {
    body: zod_1.z.object({
        code: zod_1.z
            .string()
            .min(3, 'Voucher code must be at least 3 characters')
            .max(20, 'Voucher code cannot exceed 20 characters')
            .regex(/^[A-Za-z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens and underscores'),
        title: zod_1.z.string().min(3, 'Title must be at least 3 characters'),
        discountType: zod_1.z.enum(['percentage', 'fixed']),
        discountValue: zod_1.z.number().positive('Discount value must be positive'),
        minPurchase: zod_1.z.number().min(0).optional().default(0),
        maxDiscount: zod_1.z.number().min(0).optional().default(0),
        isPublic: zod_1.z.boolean().optional().default(true),
        isActive: zod_1.z.boolean().optional().default(true),
        validUntil: zod_1.z.string().or(zod_1.z.date()).refine((val) => !isNaN(new Date(val).getTime()), {
            message: 'Invalid date format for validUntil',
        }),
        usageLimit: zod_1.z.number().min(0).optional().default(0),
    }),
};
exports.updateVoucherSchema = {
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Voucher ID is required'),
    }),
    body: zod_1.z.object({
        title: zod_1.z.string().min(3).optional(),
        discountType: zod_1.z.enum(['percentage', 'fixed']).optional(),
        discountValue: zod_1.z.number().positive().optional(),
        minPurchase: zod_1.z.number().min(0).optional(),
        maxDiscount: zod_1.z.number().min(0).optional(),
        isPublic: zod_1.z.boolean().optional(),
        isActive: zod_1.z.boolean().optional(),
        validUntil: zod_1.z.string().or(zod_1.z.date()).optional(),
        usageLimit: zod_1.z.number().min(0).optional(),
    }),
};
exports.validateVoucherSchema = {
    body: zod_1.z.object({
        code: zod_1.z.string().min(1, 'Voucher code is required'),
        subtotal: zod_1.z.number().min(0, 'Subtotal must be non-negative'),
    }),
};
exports.voucherIdParamSchema = {
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Voucher ID is required'),
    }),
};
