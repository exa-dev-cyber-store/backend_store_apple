import { Router, RequestHandler } from 'express';
import {
  getVapidPublicKey,
  streamNotifications,
  registerDevice,
  getNotifications,
  markAsRead,
  markAllAsRead,
  broadcastNotification,
  getBroadcastHistory,
} from './controller';
import { authenticate, authorize, optionalAuth } from '../../middleware/auth';

const router: Router = Router();

// SSE endpoint (requires valid authentication token via header, cookie, or ?token= query param)
router.get('/notifications/vapid-key', getVapidPublicKey);
router.get('/notifications/stream', authenticate as RequestHandler, streamNotifications);

// User endpoints
router.get('/notifications', authenticate as RequestHandler, getNotifications);
router.post('/notifications/devices', authenticate as RequestHandler, registerDevice);
router.patch('/notifications/:id/read', authenticate as RequestHandler, markAsRead);
router.patch('/notifications/read-all', authenticate as RequestHandler, markAllAsRead);

// Admin Broadcast endpoints
router.post(
  '/notifications/broadcast',
  authenticate as RequestHandler,
  authorize('admin') as RequestHandler,
  broadcastNotification
);
router.get(
  '/notifications/broadcast-history',
  authenticate as RequestHandler,
  authorize('admin') as RequestHandler,
  getBroadcastHistory
);

export default router;
