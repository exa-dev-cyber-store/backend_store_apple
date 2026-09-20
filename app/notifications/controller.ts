import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Notifications, DeviceSubscriptions } from './model';
import { NotificationService } from './service';
import ErrorHandler from '../../middleware/errorHandler';
import { ApiResponse } from '../../types/response';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../types/errors';

export const getVapidPublicKey = ErrorHandler.catchAsync(async (_req: Request, res: Response) => {
  res.status(200).json(
    ApiResponse.success(
      { publicKey: NotificationService.getVapidPublicKey() },
      'VAPID public key retrieved successfully'
    )
  );
});

export const streamNotifications = (req: Request, res: Response) => {
  const authenticatedUser = req.user as any;
  const userId = authenticatedUser?._id ? String(authenticatedUser._id) : (req.query.userId ? String(req.query.userId) : 'all');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Content-Encoding', 'none');
  res.flushHeaders?.();

  // Tell browser client to auto-retry after 3000ms if connection is dropped
  res.write('retry: 3000\n\n');

  // Send initial connection handshake
  res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);

  NotificationService.addSseClient(userId, res);

  // Heartbeat ping every 15s to keep connection alive through NAT, proxies, and browser sleep
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
    }
  }, 15000);

  const cleanup = () => {
    clearInterval(pingInterval);
  };

  req.on('close', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
};

export const registerDevice = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  if (!user?._id) {
    throw new UnauthorizedError('User authentication required to register device');
  }
  const userObjectId = new Types.ObjectId(user._id);

  const { platform, endpoint, keys, fcmToken } = req.body;
  if (!platform || !['web', 'ios', 'android'].includes(platform)) {
    throw new BadRequestError('Valid platform is required (web, ios, android)');
  }

  if (!endpoint && !fcmToken) {
    throw new BadRequestError('Either fcmToken or Web Push endpoint must be provided');
  }

  // Find criteria: Match existing token/endpoint first to avoid duplicate entries
  const filter: any = { platform };
  if (fcmToken) {
    filter.fcmToken = fcmToken;
  } else if (endpoint) {
    filter.endpoint = endpoint;
  }

  const updateData: any = {
    platform,
    lastActive: new Date(),
  };

  if (userObjectId) {
    updateData.user = userObjectId;
  }
  if (endpoint) updateData.endpoint = endpoint;
  if (keys) updateData.keys = keys;
  if (fcmToken) updateData.fcmToken = fcmToken;

  const subscription = await DeviceSubscriptions.findOneAndUpdate(
    filter,
    { $set: updateData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(200).json(ApiResponse.success(subscription, 'Device registered for push notifications'));
});

export const getNotifications = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const userObjectId = user?._id ? new Types.ObjectId(user._id) : null;
  const limit = parseInt(req.query.limit as string) || 20;
  const page = parseInt(req.query.page as string) || 1;
  const skip = (page - 1) * limit;

  // Filter: personal notifications OR global broadcast notifications (user: null)
  const filter: any = userObjectId
    ? { $or: [{ user: userObjectId }, { user: null }] }
    : { user: null };

  const [notifications, total, unreadCount] = await Promise.all([
    Notifications.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notifications.countDocuments(filter),
    Notifications.countDocuments({ ...filter, isRead: false }),
  ]);

  res.status(200).json(
    ApiResponse.success(
      {
        notifications,
        unreadCount,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Notifications retrieved successfully'
    )
  );
});

export const markAsRead = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const notification = await Notifications.findByIdAndUpdate(
    id,
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  res.status(200).json(ApiResponse.success(notification, 'Notification marked as read'));
});

export const markAllAsRead = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  if (!user?._id) {
    throw new UnauthorizedError('User authentication required');
  }

  await Notifications.updateMany(
    {
      $or: [{ user: new Types.ObjectId(user._id) }, { user: null }],
      isRead: false,
    },
    { isRead: true }
  );

  res.status(200).json(ApiResponse.success(null, 'All notifications marked as read'));
});

export const broadcastNotification = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
  const { title, body, type, target, userId, voucherCode, discount, link } = req.body;

  if (!title || !body) {
    throw new BadRequestError('Title and Body are required for notification');
  }

  const notification = await NotificationService.sendCustomNotification({
    title,
    body,
    type: type || 'voucher',
    target: target || 'all',
    userId,
    voucherCode,
    discount: discount ? Number(discount) : undefined,
    link,
  });

  res.status(201).json(
    ApiResponse.success(notification, 'Push notification broadcast dispatched successfully')
  );
});

export const getBroadcastHistory = ErrorHandler.catchAsync(async (_req: Request, res: Response) => {
  const notifications = await Notifications.find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('user', 'name email');

  res.status(200).json(ApiResponse.success(notifications, 'Broadcast history retrieved successfully'));
});
