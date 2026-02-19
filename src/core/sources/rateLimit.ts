export interface TokenBucketConfig {
  capacity: number;
  refillPerSecond: number;
}

type BucketState = {
  tokens: number;
  lastRefillAt: number;
};

const buckets = new Map<string, BucketState>();

const refillBucket = (source: string, config: TokenBucketConfig): BucketState => {
  const now = Date.now();
  const existing = buckets.get(source) ?? { tokens: config.capacity, lastRefillAt: now };
  const elapsed = Math.max(0, now - existing.lastRefillAt);
  const refillAmount = (elapsed / 1000) * config.refillPerSecond;
  const tokens = Math.min(config.capacity, existing.tokens + refillAmount);
  const next = { tokens, lastRefillAt: now };
  buckets.set(source, next);
  return next;
};

export const waitForRateLimit = async (
  source: string,
  config: TokenBucketConfig = { capacity: 5, refillPerSecond: 2 }
): Promise<void> => {
  let state = refillBucket(source, config);
  while (state.tokens < 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    state = refillBucket(source, config);
  }

  buckets.set(source, { tokens: state.tokens - 1, lastRefillAt: Date.now() });
};
