"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const voucherSchema = new mongoose_1.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage',
        required: true,
    },
    discountValue: {
        type: Number,
        required: true,
        min: 1,
    },
    minPurchase: {
        type: Number,
        default: 0,
        min: 0,
    },
    maxDiscount: {
        type: Number,
        default: 0,
        min: 0,
    },
    isPublic: {
        type: Boolean,
        default: true, // true = visible on storefront, false = exclusive / sosmed only
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    validUntil: {
        type: Date,
        required: true,
    },
    usageLimit: {
        type: Number,
        default: 0, // 0 = unlimited
        min: 0,
    },
    usedCount: {
        type: Number,
        default: 0,
        min: 0,
    },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('Voucher', voucherSchema);
