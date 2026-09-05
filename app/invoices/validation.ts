import { z } from 'zod';
import type { ValidateSchema } from '../../utils/validator';

export const invoiceOrderIdSchema: ValidateSchema = {
  params: z.object({
    orderId: z.string().min(1, 'Order ID is required'),
  }),
};
