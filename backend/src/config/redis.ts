// Redis disabled — using in-memory no-op cache
import { logger } from '../utils/logger';

const memCache = new Map<string, { value: string; expiresAt: number }>();

export const connectRedis = async (): Promise<void> => {
  logger.info('Redis disabled — using in-memory cache');
};

export const cacheGet = async (key: string): Promise<string | null> => {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memCache.delete(key); return null; }
  return entry.value;
};

export const cacheSet = async (key: string, value: string, ttlSeconds = 300): Promise<void> => {
  memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
};

export const cacheDel = async (...keys: string[]): Promise<void> => {
  keys.forEach(k => {
    // support wildcard suffix e.g. "products:*"
    if (k.endsWith('*')) {
      const prefix = k.slice(0, -1);
      for (const key of memCache.keys()) {
        if (key.startsWith(prefix)) memCache.delete(key);
      }
    } else {
      memCache.delete(k);
    }
  });
};
