import { Schema, model, Document, Types } from 'mongoose';

export interface Voucher extends Document {
  code: string;
  title: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase: number;
  maxDiscount?: number;
  isPublic: boolean;
  isActive: boolean;
  validUntil: Date;
  usageLimit: number;
  usedCount: number;
  createdAt: Date;
  updatedAt: Date;
  _id: Types.ObjectId;
}

const voucherSchema = new Schema<Voucher>(
  {
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
  },
  { timestamps: true }
);

export default model<Voucher>('Voucher', voucherSchema);
