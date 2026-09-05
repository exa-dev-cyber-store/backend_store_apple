"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryAddressIdSchema = exports.updateDeliveryAddressSchema = exports.createDeliveryAddressSchema = void 0;
const zod_1 = require("zod");
exports.createDeliveryAddressSchema = {
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required'),
        provinsi: zod_1.z.string().min(1, 'Provinsi is required'),
        kabupaten: zod_1.z.string().min(1, 'Kabupaten is required'),
        kecamatan: zod_1.z.string().min(1, 'Kecamatan is required'),
        kelurahan: zod_1.z.string().min(1, 'Kelurahan is required'),
        detail: zod_1.z.string().min(1, 'Detail address is required'),
    }),
};
exports.updateDeliveryAddressSchema = {
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Address ID is required'),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
        provinsi: zod_1.z.string().optional(),
        kabupaten: zod_1.z.string().optional(),
        kecamatan: zod_1.z.string().optional(),
        kelurahan: zod_1.z.string().optional(),
        detail: zod_1.z.string().optional(),
    }),
};
exports.deliveryAddressIdSchema = {
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Address ID is required'),
    }),
};
