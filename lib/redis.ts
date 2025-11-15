import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis client connected');
    });
  }

  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Helper function to increment counter with TTL
export async function incrementCounter(key: string, ttl: number): Promise<number> {
  const redis = getRedisClient();
  
  const count = await redis.incr(key);
  
  // Set TTL only on the first increment (count === 1)
  if (count === 1) {
    await redis.expire(key, ttl);
  }
  
  return count;
}

// Helper function to get counter value
export async function getCounter(key: string): Promise<number> {
  const redis = getRedisClient();
  const value = await redis.get(key);
  return value ? parseInt(value, 10) : 0;
}

// Helper function to get TTL of a key
export async function getTTL(key: string): Promise<number> {
  const redis = getRedisClient();
  return redis.ttl(key);
}

