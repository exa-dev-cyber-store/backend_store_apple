"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleLikeSchema = void 0;
const zod_1 = require("zod");
exports.toggleLikeSchema = {
    body: zod_1.z.object({
        productId: zod_1.z.string().min(1, 'Product ID is required'),
    }),
};
