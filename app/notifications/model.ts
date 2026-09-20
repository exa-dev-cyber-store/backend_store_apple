import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType = 'delivery' | 'voucher' | 'promo' | 'announcement' | 'general';

export interface INotification extends Document {
  user?: Types.ObjectId | null; // null represents broadcast / global
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeviceSubscription extends Document {
  user?: Types.ObjectId | null;
  platform: 'web' | 'ios' | 'android';
  fcmToken?: string;
  endpoint?: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ['delivery', 'voucher', 'promo', 'announcement', 'general'],
      default: 'general',
      index: true,
    },
    data: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const deviceSubscriptionSchema = new Schema<IDeviceSubscription>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    platform: { type: String, enum: ['web', 'ios', 'android'], required: true },
    fcmToken: { type: String, index: true },
    endpoint: { type: String },
    keys: {
      p256dh: { type: String },
      auth: { type: String },
    },
    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes to quickly find subscriptions and avoid redundant duplicates
deviceSubscriptionSchema.index({ user: 1, platform: 1 });
deviceSubscriptionSchema.index({ fcmToken: 1 }, { sparse: true });
deviceSubscriptionSchema.index({ endpoint: 1 }, { sparse: true });

export const Notifications = model<INotification>('Notification', notificationSchema);
export const DeviceSubscriptions = model<IDeviceSubscription>('DeviceSubscription', deviceSubscriptionSchema);
