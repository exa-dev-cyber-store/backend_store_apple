"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardQuerySchema = void 0;
const zod_1 = require("zod");
exports.dashboardQuerySchema = {
    query: zod_1.z.object({
        type: zod_1.z.enum(['Month', 'Year']).optional(),
    }),
};
