import { Response } from 'express';
import webpush from 'web-push';
import { Notifications, DeviceSubscriptions, NotificationType, INotification } from './model';
import { Types } from 'mongoose';
import { initRedis, publishNotification } from './redis';

import { getFirebaseMessaging } from './firebaseAdmin';

// Configure Web Push VAPID keys if provided in environment, or use stable defaults for dev
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBKr3qBUYIHBQFLXYp5Nksh8U';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'UUxI2QCjhE4EPqILM6Wmg9s4Gg9-i3Fz1vAom3VqT7g';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@cyberapple.com';

try {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} catch (e) {
  console.warn('Web push VAPID initialization warning:', (e as Error).message);
}

// In-Memory SSE Client Connections for this server instance
const sseClients = new Map<string, Set<Response>>();

// Initialize Redis Pub/Sub listener for multi-instance message synchronization
initRedis((targetUserId, payload) => {
  NotificationService.deliverLocalSse(targetUserId, payload);
});

export class NotificationService {
  /**
   * Register an SSE client connection for real-time push updates on this instance
   */
  static addSseClient(userId: string, res: Response) {
    if (!sseClients.has(userId)) {
      sseClients.set(userId, new Set());
    }
    sseClients.get(userId)!.add(res);

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
  static async broadcastSse(targetUserId: string | null, payload: any) {
    // 1. Publish to Redis channel so all connected backend pods/instances receive it
    const published = await publishNotification(targetUserId, payload);

    // 2. If Redis is not connected (e.g. offline dev), dispatch to this instance directly
    if (!published) {
      this.deliverLocalSse(targetUserId, payload);
    }
  }

  /**
   * Write SSE event payload to local client connections on this instance
   */
  static deliverLocalSse(targetUserId: string | null, payload: any) {
    const dataStr = `data: ${JSON.stringify(payload)}\n\n`;

    if (targetUserId && sseClients.has(targetUserId)) {
      sseClients.get(targetUserId)!.forEach((res) => {
        try {
          res.write(dataStr);
        } catch {}
      });
    }

    // Always send to global 'all' listeners as well
    if (sseClients.has('all')) {
      sseClients.get('all')!.forEach((res) => {
        try {
          res.write(dataStr);
        } catch {}
      });
    }
  }

  /**
   * Send Web Push to stored browser device subscriptions (VAPID)
   */
  static async sendWebPush(targetUserId: string | null, payload: { title: string; body: string; data?: any }) {
    try {
      const query: any = { platform: 'web', endpoint: { $exists: true, $ne: '' } };
      if (targetUserId) {
        query.user = new Types.ObjectId(targetUserId);
      }

      const subscriptions = await DeviceSubscriptions.find(query);
      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: '/icon.png',
        badge: '/apple-icon.png',
        data: payload.data || {},
      });

      const promises = subscriptions.map(async (sub) => {
        if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return;
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
              },
            },
            pushPayload
          );
        } catch (err: any) {
          // If subscription has expired or unsubscribed, remove from DB
          if (err.statusCode === 404 || err.statusCode === 410) {
            await DeviceSubscriptions.findByIdAndDelete(sub._id);
          }
        }
      });

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error sending Web Push notification:', error);
    }
  }

  /**
   * Send Firebase Cloud Messaging (FCM) push notification to registered devices (Web & Mobile)
   */
  static async sendFcmPush(targetUserId: string | null, payload: { title: string; body: string; data?: any }) {
    try {
      const messaging = getFirebaseMessaging();
      if (!messaging) {
        console.warn('⚠️ [FCM] Push skipped: Firebase Admin messaging is not initialized.');
        return;
      }

      const query: any = { fcmToken: { $exists: true, $ne: '' } };
      if (targetUserId) {
        query.user = new Types.ObjectId(targetUserId);
      }

      const subscriptions = await DeviceSubscriptions.find(query).select('fcmToken platform');
      if (!subscriptions || subscriptions.length === 0) {
        console.log(`ℹ️ [FCM] No registered devices found for target: ${targetUserId || 'broadcast/all'}`);
        return;
      }

      // Extract distinct valid tokens
      const uniqueTokens = Array.from(
        new Set(subscriptions.map((s) => s.fcmToken).filter((t): t is string => Boolean(t && t.trim() !== '')))
      );
      if (uniqueTokens.length === 0) {
        console.log(`ℹ️ [FCM] No non-empty device tokens found for target: ${targetUserId || 'broadcast/all'}`);
        return;
      }

      console.log(`🚀 [FCM] Dispatching push notification to ${uniqueTokens.length} device(s)...`);

      // Convert payload data to string map for FCM
      const stringData: Record<string, string> = {};
      if (payload.data) {
        for (const [key, val] of Object.entries(payload.data)) {
          stringData[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
        }
      }

      const link = payload.data?.link || '/';

      // FCM Multicast batch limit is 500
      const batchSize = 500;
      for (let i = 0; i < uniqueTokens.length; i += batchSize) {
        const batchTokens = uniqueTokens.slice(i, i + batchSize);
        try {
          const response = await messaging.sendEachForMulticast({
            tokens: batchTokens,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            data: stringData,
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
            const tokensToRemove: string[] = [];
            response.responses.forEach((resp: any, idx: number) => {
              if (!resp.success) {
                const errCode = resp.error?.code;
                if (
                  errCode === 'messaging/invalid-registration-token' ||
                  errCode === 'messaging/registration-token-not-registered'
                ) {
                  tokensToRemove.push(batchTokens[idx]);
                }
              }
            });

            if (tokensToRemove.length > 0) {
              await DeviceSubscriptions.deleteMany({ fcmToken: { $in: tokensToRemove } });
            }
          }
        } catch (batchErr: any) {
          console.warn('⚠️ [FCM] Batch multicast error:', batchErr.message);
        }
      }
    } catch (error) {
      console.error('Error sending FCM push notification:', error);
    }
  }

  /**
   * Create notification record in DB and push to clients (Web Push + FCM + SSE)
   */
  static async createAndDispatch(options: {
    userId?: string | Types.ObjectId | null;
    title: string;
    body: string;
    type: NotificationType;
    data?: Record<string, any>;
  }): Promise<INotification> {
    const userObjectId = options.userId ? new Types.ObjectId(String(options.userId)) : null;

    const notification = await Notifications.create({
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
    await this.broadcastSse(userObjectId ? userObjectId.toString() : null, payload);

    // 2. Deliver native Web Push notification (VAPID)
    this.sendWebPush(userObjectId ? userObjectId.toString() : null, payload);

    // 3. Deliver FCM Push notification to all registered tokens (Web & Mobile)
    this.sendFcmPush(userObjectId ? userObjectId.toString() : null, payload);

    return notification;
  }

  /**
   * Delivery status change trigger (called when admin updates status in dashboard)
   */
  static async sendOrderDeliveryNotification(params: {
    orderId: string | Types.ObjectId;
    userId: string | Types.ObjectId;
    deliveryStatus: string;
  }) {
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

    return await this.createAndDispatch({
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
  }

  /**
   * Custom / Voucher Notification broadcast (from admin dashboard)
   */
  static async sendCustomNotification(params: {
    title: string;
    body: string;
    type?: NotificationType;
    target?: 'all' | 'user';
    userId?: string;
    voucherCode?: string;
    discount?: number;
    link?: string;
  }) {
    const isBroadcast = params.target !== 'user' || !params.userId;

    return await this.createAndDispatch({
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
  }

  static getVapidPublicKey() {
    return vapidPublicKey;
  }
}
