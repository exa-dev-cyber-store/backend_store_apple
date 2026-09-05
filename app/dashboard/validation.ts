import { z } from 'zod';
import type { ValidateSchema } from '../../utils/validator';

export const dashboardQuerySchema: ValidateSchema = {
  query: z.object({
    type: z.enum(['Month', 'Year']).optional(),
  }),
};
