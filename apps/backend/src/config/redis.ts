import Redis from 'ioredis';
import { config } from './env';

export const redis = new Redis(config.redisUrl, {
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  },
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

export const redisPub = new Redis(config.redisUrl, {
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.warn('[Redis] Client error:', err.message);
});

redisPub.on('error', (err) => {
  console.warn('[Redis Pub] Client error:', err.message);
});

