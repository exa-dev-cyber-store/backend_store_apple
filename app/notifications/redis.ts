import Redis, { RedisOptions } from 'ioredis';

const REDIS_CHANNEL = process.env.REDIS_NOTIF_CHANNEL || 'cyber_apple:notifications';

const redisUrl = process.env.REDIS_URL;
const redisConfig: RedisOptions = {
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

let publisher: Redis | null = null;
let subscriber: Redis | null = null;
let isRedisConnected = false;

export function initRedis(onMessageReceived: (targetUserId: string | null, payload: any) => void) {
  try {
    publisher = redisUrl ? new Redis(redisUrl, redisConfig) : new Redis(redisConfig);
    subscriber = redisUrl ? new Redis(redisUrl, redisConfig) : new Redis(redisConfig);

    publisher.on('connect', () => {
      isRedisConnected = true;
      console.log('✅ [Redis] Publisher connected for Notification bus');
    });

    subscriber.on('connect', () => {
      console.log('✅ [Redis] Subscriber connected for Notification bus');
      subscriber?.subscribe(REDIS_CHANNEL, (err) => {
        if (err) {
          console.warn('⚠️ [Redis] Failed to subscribe to channel:', err.message);
        } else {
          console.log(`📡 [Redis] Subscribed to multi-instance channel: ${REDIS_CHANNEL}`);
        }
      });
    });

    subscriber.on('message', (channel, message) => {
      if (channel === REDIS_CHANNEL) {
        try {
          const parsed = JSON.parse(message);
          onMessageReceived(parsed.targetUserId, parsed.payload);
        } catch (e) {
          console.warn('[Redis] Failed to parse notification message:', e);
        }
      }
    });

    publisher.on('error', (err: any) => {
      isRedisConnected = false;
      if (err.code !== 'ECONNREFUSED') {
        console.warn('⚠️ [Redis Publisher Notice]:', err.message);
      }
    });

    subscriber.on('error', (err: any) => {
      if (err.code !== 'ECONNREFUSED') {
        console.warn('⚠️ [Redis Subscriber Notice]:', err.message);
      }
    });

    // Attempt connecting asynchronously
    publisher.connect().catch(() => {});
    subscriber.connect().catch(() => {});
  } catch (err: any) {
    console.warn('⚠️ [Redis] Initialization notice:', err.message);
  }
}

export async function publishNotification(targetUserId: string | null, payload: any): Promise<boolean> {
  if (publisher && isRedisConnected) {
    try {
      await publisher.publish(
        REDIS_CHANNEL,
        JSON.stringify({ targetUserId, payload })
      );
      return true;
    } catch (err) {
      console.warn('⚠️ [Redis] Publish failed, falling back to local dispatch:', err);
      return false;
    }
  }
  return false;
}
