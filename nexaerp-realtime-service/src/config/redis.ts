import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.redisUrl);

redis.on('error', (err) => {
  console.error('[redis] connection error:', err.message);
});

const presenceKey = (userId: number) => `presence:user:${userId}`;

/** Call when a socket connects. Tracks a count since one user can have multiple tabs/devices open. */
export async function markUserOnline(userId: number): Promise<void> {
  await redis.incr(presenceKey(userId));
}

/** Call when a socket disconnects. Removes presence only once all of that user's sockets are gone. */
export async function markUserOffline(userId: number): Promise<void> {
  const remaining = await redis.decr(presenceKey(userId));
  if (remaining <= 0) {
    await redis.del(presenceKey(userId));
  }
}

export async function isUserOnline(userId: number): Promise<boolean> {
  const count = await redis.get(presenceKey(userId));
  return Boolean(count) && Number(count) > 0;
}
