"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceOrderIdSchema = void 0;
const zod_1 = require("zod");
exports.invoiceOrderIdSchema = {
    params: zod_1.z.object({
        orderId: zod_1.z.string().min(1, 'Order ID is required'),
    }),
};
