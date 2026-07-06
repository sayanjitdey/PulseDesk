// apps/server/src/lib/redis.ts
import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

interface RedisConfig {
  maxRetriesPerRequest: null;
  enableReadyCheck: boolean;
}

interface RedisError extends Error {
  err: Error;
}

export const redis: Redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,   // required by BullMQ
  enableReadyCheck: false,
} as RedisConfig);

redis.on('error', (err: Error): void => logger.error({ err }, 'Redis error'));
redis.on('connect', (): void => logger.debug('Redis connected'));