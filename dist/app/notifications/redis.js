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
exports.initRedis = initRedis;
exports.publishNotification = publishNotification;
const ioredis_1 = __importDefault(require("ioredis"));
const REDIS_CHANNEL = process.env.REDIS_NOTIF_CHANNEL || 'cyber_apple:notifications';
const redisUrl = process.env.REDIS_URL;
const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
        // Retry interval backoff, capped at 5 seconds
        return Math.min(times * 1000, 5000);
    },
    lazyConnect: true,
};
let publisher = null;
let subscriber = null;
let isRedisConnected = false;
function initRedis(onMessageReceived) {
    try {
        publisher = redisUrl ? new ioredis_1.default(redisUrl, redisConfig) : new ioredis_1.default(redisConfig);
        subscriber = redisUrl ? new ioredis_1.default(redisUrl, redisConfig) : new ioredis_1.default(redisConfig);
        publisher.on('connect', () => {
            isRedisConnected = true;
            console.log('✅ [Redis] Publisher connected for Notification bus');
        });
        subscriber.on('connect', () => {
            console.log('✅ [Redis] Subscriber connected for Notification bus');
            subscriber === null || subscriber === void 0 ? void 0 : subscriber.subscribe(REDIS_CHANNEL, (err) => {
                if (err) {
                    console.warn('⚠️ [Redis] Failed to subscribe to channel:', err.message);
                }
                else {
                    console.log(`📡 [Redis] Subscribed to multi-instance channel: ${REDIS_CHANNEL}`);
                }
            });
        });
        subscriber.on('message', (channel, message) => {
            if (channel === REDIS_CHANNEL) {
                try {
                    const parsed = JSON.parse(message);
                    onMessageReceived(parsed.targetUserId, parsed.payload);
                }
                catch (e) {
                    console.warn('[Redis] Failed to parse notification message:', e);
                }
            }
        });
        publisher.on('error', (err) => {
            isRedisConnected = false;
            if (err.code !== 'ECONNREFUSED') {
                console.warn('⚠️ [Redis Publisher Notice]:', err.message);
            }
        });
        subscriber.on('error', (err) => {
            if (err.code !== 'ECONNREFUSED') {
                console.warn('⚠️ [Redis Subscriber Notice]:', err.message);
            }
        });
        // Attempt connecting asynchronously
        publisher.connect().catch(() => { });
        subscriber.connect().catch(() => { });
    }
    catch (err) {
        console.warn('⚠️ [Redis] Initialization notice:', err.message);
    }
}
function publishNotification(targetUserId, payload) {
    return __awaiter(this, void 0, void 0, function* () {
        if (publisher && isRedisConnected) {
            try {
                yield publisher.publish(REDIS_CHANNEL, JSON.stringify({ targetUserId, payload }));
                return true;
            }
            catch (err) {
                console.warn('⚠️ [Redis] Publish failed, falling back to local dispatch:', err);
                return false;
            }
        }
        return false;
    });
}
