import { z } from 'zod';
import type { ValidateSchema } from '../../utils/validator';

export const createCategorySchema: ValidateSchema = {
  body: z.object({
    name: z.string().min(1, 'Category name is required'),
  }),
};

export const updateCategorySchema: ValidateSchema = {
  params: z.object({
    id: z.string().min(1, 'Category ID is required'),
  }),
  body: z.object({
    name: z.string().min(1, 'Category name is required'),
  }),
};

export const categoryIdParamSchema: ValidateSchema = {
  params: z.object({
    id: z.string().min(1, 'Category ID is required'),
  }),
};
