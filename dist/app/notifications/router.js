"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// SSE endpoint (requires valid authentication token via header, cookie, or ?token= query param)
router.get('/notifications/vapid-key', controller_1.getVapidPublicKey);
router.get('/notifications/stream', auth_1.authenticate, controller_1.streamNotifications);
// User endpoints
router.get('/notifications', auth_1.authenticate, controller_1.getNotifications);
router.post('/notifications/devices', auth_1.authenticate, controller_1.registerDevice);
router.patch('/notifications/:id/read', auth_1.authenticate, controller_1.markAsRead);
router.patch('/notifications/read-all', auth_1.authenticate, controller_1.markAllAsRead);
// Admin Broadcast endpoints
router.post('/notifications/broadcast', auth_1.authenticate, (0, auth_1.authorize)('admin'), controller_1.broadcastNotification);
router.get('/notifications/broadcast-history', auth_1.authenticate, (0, auth_1.authorize)('admin'), controller_1.getBroadcastHistory);
exports.default = router;
