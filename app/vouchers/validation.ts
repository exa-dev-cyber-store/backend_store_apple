import { z } from 'zod';
import type { ValidateSchema } from '../../utils/validator';

export const createVoucherSchema: ValidateSchema = {
  body: z.object({
    code: z
      .string()
      .min(3, 'Voucher code must be at least 3 characters')
      .max(20, 'Voucher code cannot exceed 20 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens and underscores'),
    title: z.string().min(3, 'Title must be at least 3 characters'),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.number().positive('Discount value must be positive'),
    minPurchase: z.number().min(0).optional().default(0),
    maxDiscount: z.number().min(0).optional().default(0),
    isPublic: z.boolean().optional().default(true),
    isActive: z.boolean().optional().default(true),
    validUntil: z.string().or(z.date()).refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'Invalid date format for validUntil',
    }),
    usageLimit: z.number().min(0).optional().default(0),
  }),
};

export const updateVoucherSchema: ValidateSchema = {
  params: z.object({
    id: z.string().min(1, 'Voucher ID is required'),
  }),
  body: z.object({
    title: z.string().min(3).optional(),
    discountType: z.enum(['percentage', 'fixed']).optional(),
    discountValue: z.number().positive().optional(),
    minPurchase: z.number().min(0).optional(),
    maxDiscount: z.number().min(0).optional(),
    isPublic: z.boolean().optional(),
    isActive: z.boolean().optional(),
    validUntil: z.string().or(z.date()).optional(),
    usageLimit: z.number().min(0).optional(),
  }),
};

export const validateVoucherSchema: ValidateSchema = {
  body: z.object({
    code: z.string().min(1, 'Voucher code is required'),
    subtotal: z.number().min(0, 'Subtotal must be non-negative'),
  }),
};

export const voucherIdParamSchema: ValidateSchema = {
  params: z.object({
    id: z.string().min(1, 'Voucher ID is required'),
  }),
};
