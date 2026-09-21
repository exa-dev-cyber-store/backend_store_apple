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
exports.NotificationService = void 0;
const web_push_1 = __importDefault(require("web-push"));
const model_1 = require("./model");
const mongoose_1 = require("mongoose");
const redis_1 = require("./redis");
const firebaseAdmin_1 = require("./firebaseAdmin");
// Configure Web Push VAPID keys if provided in environment, or use stable defaults for dev
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBKr3qBUYIHBQFLXYp5Nksh8U';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'UUxI2QCjhE4EPqILM6Wmg9s4Gg9-i3Fz1vAom3VqT7g';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@cyberapple.com';
try {
    web_push_1.default.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}
catch (e) {
    console.warn('Web push VAPID initialization warning:', e.message);
}
// In-Memory SSE Client Connections for this server instance
const sseClients = new Map();
// Initialize Redis Pub/Sub listener for multi-instance message synchronization
(0, redis_1.initRedis)((targetUserId, payload) => {
    NotificationService.deliverLocalSse(targetUserId, payload);
});
class NotificationService {
    /**
     * Register an SSE client connection for real-time push updates on this instance
     */
    static addSseClient(userId, res) {
        if (!sseClients.has(userId)) {
            sseClients.set(userId, new Set());
        }
        sseClients.get(userId).add(res);
        res.on('close', () => {
            const userConns = sseClients.get(userId);
            if (userConns) {
                userConns.delete(res);
                if (userConns.size === 0) {
                    sseClients.delete(userId);
                }
            }
        });
    }
    /**
     * Broadcast SSE event across all instances via Redis Pub/Sub
     */
    static broadcastSse(targetUserId, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Publish to Redis channel so all connected backend pods/instances receive it
            const published = yield (0, redis_1.publishNotification)(targetUserId, payload);
            // 2. If Redis is not connected (e.g. offline dev), dispatch to this instance directly
            if (!published) {
                this.deliverLocalSse(targetUserId, payload);
            }
        });
    }
    /**
     * Write SSE event payload to local client connections on this instance
     */
    static deliverLocalSse(targetUserId, payload) {
        const dataStr = `data: ${JSON.stringify(payload)}\n\n`;
        if (targetUserId && sseClients.has(targetUserId)) {
            sseClients.get(targetUserId).forEach((res) => {
                try {
                    res.write(dataStr);
                }
                catch (_a) { }
            });
        }
        // Always send to global 'all' listeners as well
        if (sseClients.has('all')) {
            sseClients.get('all').forEach((res) => {
                try {
                    res.write(dataStr);
                }
                catch (_a) { }
            });
        }
    }
    /**
     * Send Web Push to stored browser device subscriptions (VAPID)
     */
    static sendWebPush(targetUserId, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const query = { platform: 'web', endpoint: { $exists: true, $ne: '' } };
                if (targetUserId) {
                    query.user = new mongoose_1.Types.ObjectId(targetUserId);
                }
                const subscriptions = yield model_1.DeviceSubscriptions.find(query);
                const pushPayload = JSON.stringify({
                    title: payload.title,
                    body: payload.body,
                    icon: '/icon.png',
                    badge: '/apple-icon.png',
                    data: payload.data || {},
                });
                const promises = subscriptions.map((sub) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    if (!sub.endpoint || !((_a = sub.keys) === null || _a === void 0 ? void 0 : _a.p256dh) || !((_b = sub.keys) === null || _b === void 0 ? void 0 : _b.auth))
                        return;
                    try {
                        yield web_push_1.default.sendNotification({
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.keys.p256dh,
                                auth: sub.keys.auth,
                            },
                        }, pushPayload);
                    }
                    catch (err) {
                        // If subscription has expired or unsubscribed, remove from DB
                        if (err.statusCode === 404 || err.statusCode === 410) {
                            yield model_1.DeviceSubscriptions.findByIdAndDelete(sub._id);
                        }
                    }
                }));
                yield Promise.allSettled(promises);
            }
            catch (error) {
                console.error('Error sending Web Push notification:', error);
            }
        });
    }
    /**
     * Send Firebase Cloud Messaging (FCM) push notification to registered devices (Web & Mobile)
     */
    static sendFcmPush(targetUserId, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const messaging = (0, firebaseAdmin_1.getFirebaseMessaging)();
                if (!messaging) {
                    console.warn('⚠️ [FCM] Push skipped: Firebase Admin messaging is not initialized.');
                    return;
                }
                const query = { fcmToken: { $exists: true, $ne: '' } };
                if (targetUserId) {
                    query.user = new mongoose_1.Types.ObjectId(targetUserId);
                }
                const subscriptions = yield model_1.DeviceSubscriptions.find(query).select('fcmToken platform');
                if (!subscriptions || subscriptions.length === 0) {
                    console.log(`ℹ️ [FCM] No registered devices found for target: ${targetUserId || 'broadcast/all'}`);
                    return;
                }
                // Extract distinct valid tokens
                const uniqueTokens = Array.from(new Set(subscriptions.map((s) => s.fcmToken).filter((t) => Boolean(t && t.trim() !== ''))));
                if (uniqueTokens.length === 0) {
                    console.log(`ℹ️ [FCM] No non-empty device tokens found for target: ${targetUserId || 'broadcast/all'}`);
                    return;
                }
                console.log(`🚀 [FCM] Dispatching push notification to ${uniqueTokens.length} device(s)...`);
                // Convert payload data to string map for FCM
                const stringData = {};
                if (payload.data) {
                    for (const [key, val] of Object.entries(payload.data)) {
                        stringData[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
                    }
                }
                const link = ((_a = payload.data) === null || _a === void 0 ? void 0 : _a.link) || '/';
                let userBadgeCount;
                if (targetUserId) {
                    try {
                        userBadgeCount = yield model_1.Notifications.countDocuments({
                            $or: [{ user: new mongoose_1.Types.ObjectId(targetUserId) }, { user: null }],
                            isRead: false,
                        });
                    }
                    catch (_b) {
                        userBadgeCount = 1;
                    }
                }
                // FCM Multicast batch limit is 500
                const batchSize = 500;
                for (let i = 0; i < uniqueTokens.length; i += batchSize) {
                    const batchTokens = uniqueTokens.slice(i, i + batchSize);
                    try {
                        const response = yield messaging.sendEachForMulticast({
                            tokens: batchTokens,
                            notification: {
                                title: payload.title,
                                body: payload.body,
                            },
                            data: stringData,
                            android: {
                                priority: 'high',
                                notification: {
                                    title: payload.title,
                                    body: payload.body,
                                    sound: 'default',
                                    defaultSound: true,
                                    channelId: 'cyber_apple_notifications',
                                    clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                                },
                            },
                            apns: {
                                headers: {
                                    'apns-priority': '10',
                                    'apns-push-type': 'alert',
                                },
                                payload: {
                                    aps: {
                                        alert: {
                                            title: payload.title,
                                            body: payload.body,
                                        },
                                        sound: 'default',
                                        badge: typeof userBadgeCount === 'number' ? userBadgeCount : 1,
                                        contentAvailable: true,
                                    },
                                },
                            },
                            webpush: {
                                notification: {
                                    title: payload.title,
                                    body: payload.body,
                                    icon: '/icon-192.png',
                                    badge: '/apple-touch-icon.png',
                                },
                                fcmOptions: {
                                    link,
                                },
                            },
                        });
                        console.log(`✅ [FCM] Batch result: ${response.successCount} succeeded, ${response.failureCount} failed.`);
                        // Automatically clean up stale or unregistered tokens
                        if (response.failureCount > 0) {
                            const tokensToRemove = [];
                            response.responses.forEach((resp, idx) => {
                                var _a;
                                if (!resp.success) {
                                    const errCode = (_a = resp.error) === null || _a === void 0 ? void 0 : _a.code;
                                    if (errCode === 'messaging/invalid-registration-token' ||
                                        errCode === 'messaging/registration-token-not-registered') {
                                        tokensToRemove.push(batchTokens[idx]);
                                    }
                                }
                            });
                            if (tokensToRemove.length > 0) {
                                yield model_1.DeviceSubscriptions.deleteMany({ fcmToken: { $in: tokensToRemove } });
                            }
                        }
                    }
                    catch (batchErr) {
                        console.warn('⚠️ [FCM] Batch multicast error:', batchErr.message);
                    }
                }
            }
            catch (error) {
                console.error('Error sending FCM push notification:', error);
            }
        });
    }
    /**
     * Create notification record in DB and push to clients (Web Push + FCM + SSE)
     */
    static createAndDispatch(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const userObjectId = options.userId ? new mongoose_1.Types.ObjectId(String(options.userId)) : null;
            const notification = yield model_1.Notifications.create({
                user: userObjectId,
                title: options.title,
                body: options.body,
                type: options.type,
                data: options.data || {},
                isRead: false,
            });
            const payload = {
                _id: String(notification._id),
                id: String(notification._id),
                title: notification.title,
                body: notification.body,
                type: notification.type,
                data: notification.data,
                isRead: false,
                createdAt: notification.createdAt,
            };
            // 1. Deliver real-time SSE event to web & mobile (via Redis pub/sub across all instances)
            yield this.broadcastSse(userObjectId ? userObjectId.toString() : null, payload);
            // 2. Deliver native Web Push notification (VAPID) and FCM push notification concurrently
            yield Promise.allSettled([
                this.sendWebPush(userObjectId ? userObjectId.toString() : null, payload),
                this.sendFcmPush(userObjectId ? userObjectId.toString() : null, payload),
            ]);
            return notification;
        });
    }
    /**
     * Delivery status change trigger (called when admin updates status in dashboard)
     */
    static sendOrderDeliveryNotification(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const orderIdStr = String(params.orderId);
            const shortId = orderIdStr.slice(-6).toUpperCase();
            let title = 'Status Pengiriman Diperbarui 📦';
            let body = `Pesanan #${shortId} status delivery diperbarui menjadi ${params.deliveryStatus}.`;
            switch (params.deliveryStatus.toLowerCase()) {
                case 'process':
                    title = 'Pesanan Sedang Dikirim! 🚚';
                    body = `Kabar baik! Pesanan #${shortId} saat ini sedang dalam proses pengiriman ke alamat tujuan Anda.`;
                    break;
                case 'delivered':
                    title = 'Pesanan Telah Sampai! 🎉';
                    body = `Paket pesanan #${shortId} telah berhasil sampai di alamat Anda. Selamat menikmati produk Apple baru Anda!`;
                    break;
                case 'cancelled':
                    title = 'Pengiriman Pesanan Dibatalkan ⚠️';
                    body = `Pengiriman untuk pesanan #${shortId} telah dibatalkan. Hubungi customer support kami jika ada pertanyaan.`;
                    break;
                case 'pending':
                    title = 'Pesanan Menunggu Pengiriman 🕒';
                    body = `Pesanan #${shortId} sedang disiapkan oleh tim logistik kami untuk pengiriman.`;
                    break;
            }
            return yield this.createAndDispatch({
                userId: params.userId,
                title,
                body,
                type: 'delivery',
                data: {
                    orderId: orderIdStr,
                    status_delivery: params.deliveryStatus,
                    link: `/account/order`,
                },
            });
        });
    }
    /**
     * Custom / Voucher Notification broadcast (from admin dashboard)
     */
    static sendCustomNotification(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const isBroadcast = params.target !== 'user' || !params.userId;
            return yield this.createAndDispatch({
                userId: isBroadcast ? null : params.userId,
                title: params.title,
                body: params.body,
                type: params.type || (params.voucherCode ? 'voucher' : 'promo'),
                data: {
                    voucherCode: params.voucherCode,
                    discount: params.discount,
                    link: params.link || (params.voucherCode ? '/shop' : '/'),
                },
            });
        });
    }
    static getVapidPublicKey() {
        return vapidPublicKey;
    }
}
exports.NotificationService = NotificationService;
