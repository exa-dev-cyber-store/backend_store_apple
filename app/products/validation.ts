import { z } from 'zod';
import { numeric, type ValidateSchema } from '../../utils/validator';

export const listProductsSchema: ValidateSchema = {
  query: z.object({
    q: z.string().optional(),
    category: z.string().optional(),
    limit: numeric(1).optional(),
    skip: numeric(0).optional(),
    page: numeric(1).optional(),
    sort: z.string().optional(),
  }),
};

export const productIdParamSchema: ValidateSchema = {
  params: z.object({
    id: z.string().min(1, 'Product ID is required'),
  }),
};

export const createProductSchema: ValidateSchema = {
  body: z.object({
    name: z.string().min(2, 'Product name must be at least 2 characters'),
    price: numeric(0, undefined),
    category: z.string().min(1, 'Category ID is required'),
    description: z.string().min(1, 'Description is required'),
  }),
};

export const updateProductSchema: ValidateSchema = {
  params: z.object({
    id: z.string().min(1, 'Product ID is required'),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    price: numeric(0, undefined).optional(),
    category: z.string().optional(),
    description: z.string().optional(),
  }),
};
