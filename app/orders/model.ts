import { Schema, model, Types, Document } from "mongoose";
import { DeliveryAddress } from "../deliveryAddress/model";
import Invoices, { Invoice } from "../invoices/model";

export interface OrderItem {
    _id: Types.ObjectId;
    quantity: number;
    price: number;
    name: string;
}

export interface Order extends Document {
    user: Types.ObjectId;
    order_items: OrderItem[];
    delivery_address: DeliveryAddress;
    url_redirect: string;
    total: number;
    tax: number;
    token: string;
    payment_method: string;
    shipping: number;
    status_payment: string;
    discount: number;
    status_delivery: string;
    payment_details?: any;
};

const orderSchema = new Schema<Order>({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    tax: { type: Number },
    status_delivery: { type: String, default: 'pending', enum: ['pending', 'delivered', 'cancelled', 'process'] },
    payment_method: { type: String },
    payment_details: { type: Schema.Types.Mixed },
    shipping: { type: Number },
    token: { type: String },
    order_items: [
        {
            _id: { type: Schema.Types.ObjectId, ref: 'Product' },
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

orderSchema.pre('save', async function (next) {
    try {
        const invoice: Invoice = new Invoices({
            user: this.user,
            delivery_address: this.delivery_address,
            total: this.total,
            tax: this.tax,
            payment_method: this.payment_method,
            payment_details: (this as any).payment_details,
            shipping: this.shipping,
            discount: this.discount,
            order: this._id,
            status_payment: this.status_payment,
            status_delivery: this.status_delivery
        });
        await invoice.save();
        next();
    } catch (error) {
        next((error as Error));
    }
});

const Orders = model<Order>('Order', orderSchema);


export default Orders;