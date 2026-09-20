"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceSubscriptions = exports.Notifications = void 0;
const mongoose_1 = require("mongoose");
const notificationSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
        type: String,
        enum: ['delivery', 'voucher', 'promo', 'announcement', 'general'],
        default: 'general',
        index: true,
    },
    data: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
}, { timestamps: true });
const deviceSubscriptionSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    platform: { type: String, enum: ['web', 'ios', 'android'], required: true },
    fcmToken: { type: String, index: true },
    endpoint: { type: String },
    keys: {
        p256dh: { type: String },
        auth: { type: String },
    },
    lastActive: { type: Date, default: Date.now },
}, { timestamps: true });
// Indexes to quickly find subscriptions and avoid redundant duplicates
deviceSubscriptionSchema.index({ user: 1, platform: 1 });
deviceSubscriptionSchema.index({ fcmToken: 1 }, { sparse: true });
deviceSubscriptionSchema.index({ endpoint: 1 }, { sparse: true });
exports.Notifications = (0, mongoose_1.model)('Notification', notificationSchema);
exports.DeviceSubscriptions = (0, mongoose_1.model)('DeviceSubscription', deviceSubscriptionSchema);
