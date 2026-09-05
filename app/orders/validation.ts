import { z } from 'zod';
import { numeric, type ValidateSchema } from '../../utils/validator';

export const createOrderSchema: ValidateSchema = {
  body: z.object({
    deliveryAddress: z.string().min(1, 'Delivery address ID is required'),
    delivery_fee: numeric(0).optional(),
    override_notification_url: z.string().optional(),
  }),
};

export const chargeOrderSchema: ValidateSchema = {
  body: z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    paymentType: z.string().min(1, 'Payment type is required'),
    bank: z.string().optional(),
    store: z.string().optional(),
  }),
};

export const updateOrderStatusSchema: ValidateSchema = {
  params: z.object({
    id: z.string().min(1, 'Order ID is required'),
  }),
  body: z.object({
    status_delivery: z.string().optional(),
    status_payment: z.string().optional(),
  }),
};

export const orderIdParamSchema: ValidateSchema = {
  params: z.object({
    id: z.string().min(1, 'Order ID is required'),
  }),
};

export const listOrdersQuerySchema: ValidateSchema = {
  query: z.object({
    limit: numeric(1).optional(),
    skip: numeric(0).optional(),
    page: numeric(1).optional(),
    status: z.string().optional(),
  }),
};
