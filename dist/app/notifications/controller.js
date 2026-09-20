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
exports.getBroadcastHistory = exports.broadcastNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = exports.registerDevice = exports.streamNotifications = exports.getVapidPublicKey = void 0;
const mongoose_1 = require("mongoose");
const model_1 = require("./model");
const service_1 = require("./service");
const errorHandler_1 = __importDefault(require("../../middleware/errorHandler"));
const response_1 = require("../../types/response");
const errors_1 = require("../../types/errors");
const model_2 = __importDefault(require("../users/model"));
exports.getVapidPublicKey = errorHandler_1.default.catchAsync((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(200).json(response_1.ApiResponse.success({ publicKey: service_1.NotificationService.getVapidPublicKey() }, 'VAPID public key retrieved successfully'));
}));
const streamNotifications = (req, res) => {
    var _a;
    const authenticatedUser = req.user;
    const userId = (authenticatedUser === null || authenticatedUser === void 0 ? void 0 : authenticatedUser._id) ? String(authenticatedUser._id) : (req.query.userId ? String(req.query.userId) : 'all');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Content-Encoding', 'none');
    (_a = res.flushHeaders) === null || _a === void 0 ? void 0 : _a.call(res);
    // Tell browser client to auto-retry after 3000ms if connection is dropped
    res.write('retry: 3000\n\n');
    // Send initial connection handshake
    res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);
    service_1.NotificationService.addSseClient(userId, res);
    // Heartbeat ping every 15s to keep connection alive through NAT, proxies, and browser sleep
    const pingInterval = setInterval(() => {
        try {
            res.write(': ping\n\n');
        }
        catch (_a) {
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
exports.streamNotifications = streamNotifications;
exports.registerDevice = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    if (!(user === null || user === void 0 ? void 0 : user._id)) {
        throw new errors_1.UnauthorizedError('User authentication required to register device');
    }
    const userObjectId = new mongoose_1.Types.ObjectId(user._id);
    const { platform, endpoint, keys, fcmToken } = req.body;
    if (!platform || !['web', 'ios', 'android'].includes(platform)) {
        throw new errors_1.BadRequestError('Valid platform is required (web, ios, android)');
    }
    if (!endpoint && !fcmToken) {
        throw new errors_1.BadRequestError('Either fcmToken or Web Push endpoint must be provided');
    }
    // Find criteria: Match existing token/endpoint first to avoid duplicate entries
    const filter = { platform };
    if (fcmToken) {
        filter.fcmToken = fcmToken;
    }
    else if (endpoint) {
        filter.endpoint = endpoint;
    }
    const updateData = {
        platform,
        lastActive: new Date(),
    };
    if (userObjectId) {
        updateData.user = userObjectId;
    }
    if (endpoint)
        updateData.endpoint = endpoint;
    if (keys)
        updateData.keys = keys;
    if (fcmToken)
        updateData.fcmToken = fcmToken;
    const subscription = yield model_1.DeviceSubscriptions.findOneAndUpdate(filter, { $set: updateData }, { upsert: true, new: true, setDefaultsOnInsert: true });
    res.status(200).json(response_1.ApiResponse.success(subscription, 'Device registered for push notifications'));
}));
exports.getNotifications = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const userObjectId = (user === null || user === void 0 ? void 0 : user._id) ? new mongoose_1.Types.ObjectId(user._id) : null;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    // Filter: personal notifications OR global broadcast notifications (user: null)
    const filter = userObjectId
        ? { $or: [{ user: userObjectId }, { user: null }] }
        : { user: null };
    const [notifications, total, unreadCount] = yield Promise.all([
        model_1.Notifications.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        model_1.Notifications.countDocuments(filter),
        model_1.Notifications.countDocuments(Object.assign(Object.assign({}, filter), { isRead: false })),
    ]);
    res.status(200).json(response_1.ApiResponse.success({
        notifications,
        unreadCount,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    }, 'Notifications retrieved successfully'));
}));
exports.markAsRead = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const notification = yield model_1.Notifications.findByIdAndUpdate(id, { isRead: true }, { new: true });
    if (!notification) {
        throw new errors_1.NotFoundError('Notification not found');
    }
    res.status(200).json(response_1.ApiResponse.success(notification, 'Notification marked as read'));
}));
exports.markAllAsRead = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    if (!(user === null || user === void 0 ? void 0 : user._id)) {
        throw new errors_1.UnauthorizedError('User authentication required');
    }
    yield model_1.Notifications.updateMany({
        $or: [{ user: new mongoose_1.Types.ObjectId(user._id) }, { user: null }],
        isRead: false,
    }, { isRead: true });
    res.status(200).json(response_1.ApiResponse.success(null, 'All notifications marked as read'));
}));
exports.broadcastNotification = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, body, type, target, userId, userEmail, email, voucherCode, discount, link } = req.body;
    if (!title || !body) {
        throw new errors_1.BadRequestError('Title and Body are required for notification');
    }
    let targetUserId = userId;
    if (target === 'user') {
        const emailToSearch = userEmail || email || (typeof userId === 'string' && userId.includes('@') ? userId : null);
        if (emailToSearch) {
            const foundUser = yield model_2.default.findOne({ email: emailToSearch.toLowerCase().trim() });
            if (!foundUser) {
                throw new errors_1.NotFoundError(`User with email "${emailToSearch}" not found`);
            }
            targetUserId = foundUser._id;
        }
        else if (userId) {
            if (!mongoose_1.Types.ObjectId.isValid(userId)) {
                throw new errors_1.BadRequestError('Valid User ID or Email is required for specific user target');
            }
            const foundUser = yield model_2.default.findById(userId);
            if (!foundUser) {
                throw new errors_1.NotFoundError('User not found');
            }
            targetUserId = foundUser._id;
        }
        else {
            throw new errors_1.BadRequestError('Email or User ID is required when targeting a specific user');
        }
    }
    const notification = yield service_1.NotificationService.sendCustomNotification({
        title,
        body,
        type: type || 'voucher',
        target: target || 'all',
        userId: target === 'user' ? String(targetUserId) : undefined,
        voucherCode,
        discount: discount ? Number(discount) : undefined,
        link,
    });
    res.status(201).json(response_1.ApiResponse.success(notification, 'Push notification broadcast dispatched successfully'));
}));
exports.getBroadcastHistory = errorHandler_1.default.catchAsync((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const notifications = yield model_1.Notifications.find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('user', 'name email');
    res.status(200).json(response_1.ApiResponse.success(notifications, 'Broadcast history retrieved successfully'));
}));
