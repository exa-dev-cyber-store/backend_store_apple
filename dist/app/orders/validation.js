"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOrdersQuerySchema = exports.orderIdParamSchema = exports.updateOrderStatusSchema = exports.chargeOrderSchema = exports.createOrderSchema = void 0;
const zod_1 = require("zod");
const validator_1 = require("../../utils/validator");
exports.createOrderSchema = {
    body: zod_1.z.object({
        deliveryAddress: zod_1.z.string().min(1, 'Delivery address ID is required'),
        delivery_fee: (0, validator_1.numeric)(0).optional(),
        override_notification_url: zod_1.z.string().optional(),
    }),
};
exports.chargeOrderSchema = {
    body: zod_1.z.object({
        orderId: zod_1.z.string().optional(),
        order_id: zod_1.z.string().optional(),
        deliveryAddress: zod_1.z.string().optional(),
        paymentType: zod_1.z.string().optional(),
        payment_type: zod_1.z.string().optional(),
        bank: zod_1.z.string().optional(),
        store: zod_1.z.string().optional(),
        subTotal: (0, validator_1.numeric)(0).optional(),
        tax: (0, validator_1.numeric)(0).optional(),
        shipping: (0, validator_1.numeric)(0).optional(),
        discount: (0, validator_1.numeric)(0).optional(),
        total: (0, validator_1.numeric)(0).optional(),
        override_notification_url: zod_1.z.string().optional(),
    }).refine((data) => Boolean(data.orderId || data.order_id || data.deliveryAddress), {
        message: 'Either orderId (or order_id) or deliveryAddress is required',
        path: ['orderId'],
    }),
};
exports.updateOrderStatusSchema = {
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Order ID is required'),
    }),
    body: zod_1.z.object({
        status_delivery: zod_1.z.string().optional(),
        status_payment: zod_1.z.string().optional(),
    }),
};
exports.orderIdParamSchema = {
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Order ID is required'),
    }),
};
exports.listOrdersQuerySchema = {
    query: zod_1.z.object({
        limit: (0, validator_1.numeric)(1).optional(),
        skip: (0, validator_1.numeric)(0).optional(),
        page: (0, validator_1.numeric)(1).optional(),
        status: zod_1.z.string().optional(),
    }),
};
