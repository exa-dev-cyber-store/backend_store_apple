"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.createProductSchema = exports.productIdParamSchema = exports.listProductsSchema = void 0;
const zod_1 = require("zod");
const validator_1 = require("../../utils/validator");
exports.listProductsSchema = {
    query: zod_1.z.object({
        q: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        limit: (0, validator_1.numeric)(1).optional(),
        skip: (0, validator_1.numeric)(0).optional(),
        page: (0, validator_1.numeric)(1).optional(),
        sort: zod_1.z.string().optional(),
    }),
};
exports.productIdParamSchema = {
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Product ID is required'),
    }),
};
exports.createProductSchema = {
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Product name must be at least 2 characters'),
        price: (0, validator_1.numeric)(0, undefined),
        category: zod_1.z.string().min(1, 'Category ID is required'),
        description: zod_1.z.string().min(1, 'Description is required'),
    }),
};
exports.updateProductSchema = {
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Product ID is required'),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).optional(),
        price: (0, validator_1.numeric)(0, undefined).optional(),
        category: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
    }),
};
