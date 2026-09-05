import { Schema, model, Document, Types } from "mongoose";
import { DeliveryAddress } from "../deliveryAddress/model";

export interface Invoice extends Document {
    user: Types.ObjectId;
    delivery_address: DeliveryAddress;
    quantity: number;
    total: number;
    tax: number;
    order: Types.ObjectId;
    payment_method: string;
    shipping: number;
    status_payment: string;
    discount: number;
    status_delivery: string;
    payment_details?: any;
}

const invoiceSchema = new Schema<Invoice>({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    tax: { type: Number },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    status_delivery: { type: String, default: 'pending', enum: ['pending', 'delivered', 'cancelled', 'process'] },
    payment_method: { type: String },
    payment_details: { type: Schema.Types.Mixed },
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

const Invoices = model<Invoice>('Invoice', invoiceSchema);

export default Invoices;