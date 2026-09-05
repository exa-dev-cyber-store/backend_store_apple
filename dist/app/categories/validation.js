"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryIdParamSchema = exports.updateCategorySchema = exports.createCategorySchema = void 0;
const zod_1 = require("zod");
exports.createCategorySchema = {
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Category name is required'),
    }),
};
exports.updateCategorySchema = {
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Category ID is required'),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Category name is required'),
    }),
};
exports.categoryIdParamSchema = {
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Category ID is required'),
    }),
};
