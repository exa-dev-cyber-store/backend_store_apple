"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeCartSchema = exports.reduceCartSchema = exports.addToCartSchema = void 0;
const zod_1 = require("zod");
const validator_1 = require("../../utils/validator");
exports.addToCartSchema = {
    body: zod_1.z.object({
        productId: zod_1.z.string().min(1, 'Product ID is required'),
        quantity: (0, validator_1.numeric)(1).default(1),
    }),
};
exports.reduceCartSchema = {
    body: zod_1.z.object({
        productId: zod_1.z.string().min(1, 'Product ID is required'),
    }),
};
exports.removeCartSchema = {
    body: zod_1.z.object({
        productId: zod_1.z.string().min(1, 'Product ID is required'),
    }),
};
