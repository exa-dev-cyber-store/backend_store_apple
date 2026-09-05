import { z } from 'zod';
import type { ValidateSchema } from '../../utils/validator';

export const createDeliveryAddressSchema: ValidateSchema = {
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    provinsi: z.string().min(1, 'Provinsi is required'),
    kabupaten: z.string().min(1, 'Kabupaten is required'),
    kecamatan: z.string().min(1, 'Kecamatan is required'),
    kelurahan: z.string().min(1, 'Kelurahan is required'),
    detail: z.string().min(1, 'Detail address is required'),
  }),
};

export const updateDeliveryAddressSchema: ValidateSchema = {
  params: z.object({
    id: z.string().min(1, 'Address ID is required'),
  }),
  body: z.object({
    name: z.string().optional(),
    provinsi: z.string().optional(),
    kabupaten: z.string().optional(),
    kecamatan: z.string().optional(),
    kelurahan: z.string().optional(),
    detail: z.string().optional(),
  }),
};

export const deliveryAddressIdSchema: ValidateSchema = {
  params: z.object({
    id: z.string().min(1, 'Address ID is required'),
  }),
};
