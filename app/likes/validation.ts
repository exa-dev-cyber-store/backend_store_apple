import { z } from 'zod';
import type { ValidateSchema } from '../../utils/validator';

export const toggleLikeSchema: ValidateSchema = {
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
  }),
};
