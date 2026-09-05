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
    orderId: z.string().optional(),
    order_id: z.string().optional(),
    deliveryAddress: z.string().optional(),
    paymentType: z.string().optional(),
    payment_type: z.string().optional(),
    bank: z.string().optional(),
    store: z.string().optional(),
    subTotal: numeric(0).optional(),
    tax: numeric(0).optional(),
    shipping: numeric(0).optional(),
    discount: numeric(0).optional(),
    total: numeric(0).optional(),
    override_notification_url: z.string().optional(),
  }).refine((data) => Boolean(data.orderId || data.order_id || data.deliveryAddress), {
    message: 'Either orderId (or order_id) or deliveryAddress is required',
    path: ['orderId'],
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
