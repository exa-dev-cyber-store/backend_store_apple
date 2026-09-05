import { z } from 'zod';
import { numeric, type ValidateSchema } from '../../utils/validator';

export const addToCartSchema: ValidateSchema = {
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    quantity: numeric(1).default(1),
  }),
};

export const reduceCartSchema: ValidateSchema = {
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
  }),
};

export const removeCartSchema: ValidateSchema = {
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
  }),
};
