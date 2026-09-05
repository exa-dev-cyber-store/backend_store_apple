"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const invoiceSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    tax: { type: Number },
    order: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Order' },
    status_delivery: { type: String, default: 'pending', enum: ['pending', 'delivered', 'cancelled', 'process'] },
    payment_method: { type: String },
    payment_details: { type: mongoose_1.Schema.Types.Mixed },
    shipping: { type: Number },
    delivery_address: {
        provinsi: { type: String, required: true },
        kabupaten: { type: String, required: true },
        name: { type: String, required: true },
        kecamatan: { type: String, required: true },
        kelurahan: { type: String, required: true },
        detail: { type: String, required: true }
    },
    discount: { type: Number },
    total: { type: Number },
    status_payment: { type: String, default: 'pending', enum: ['pending', 'completed', 'cancelled'] }
}, { timestamps: true });
const Invoices = (0, mongoose_1.model)('Invoice', invoiceSchema);
exports.default = Invoices;
