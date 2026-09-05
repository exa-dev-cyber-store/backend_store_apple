"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const model_1 = __importDefault(require("../invoices/model"));
;
const orderSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    tax: { type: Number },
    status_delivery: { type: String, default: 'pending', enum: ['pending', 'delivered', 'cancelled', 'process'] },
    payment_method: { type: String },
    payment_details: { type: mongoose_1.Schema.Types.Mixed },
    shipping: { type: Number },
    token: { type: String },
    order_items: [
        {
            _id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' },
            quantity: { type: Number },
            price: { type: Number },
            name: { type: String }
        }
    ],
    url_redirect: { type: String },
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
orderSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const invoice = new model_1.default({
                user: this.user,
                delivery_address: this.delivery_address,
                total: this.total,
                tax: this.tax,
                payment_method: this.payment_method,
                payment_details: this.payment_details,
                shipping: this.shipping,
                discount: this.discount,
                order: this._id,
                status_payment: this.status_payment,
                status_delivery: this.status_delivery
            });
            yield invoice.save();
            next();
        }
        catch (error) {
            next(error);
        }
    });
});
const Orders = (0, mongoose_1.model)('Order', orderSchema);
exports.default = Orders;
