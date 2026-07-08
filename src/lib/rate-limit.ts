type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

const globalRateLimit = globalThis as unknown as {
  atdRateLimitStore?: Map<string, RateLimitRecord>;
};

const store = globalRateLimit.atdRateLimitStore ?? new Map<string, RateLimitRecord>();
globalRateLimit.atdRateLimitStore = store;

export function consumeRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const existing = store.get(key);

  cleanupExpired(now);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, {
      count: 1,
      resetAt,
    });

    return {
      limited: false,
      remaining: Math.max(limit - 1, 0),
      resetAt,
    };
  }

  if (existing.count >= limit) {
    return {
      limited: true,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;

  return {
    limited: false,
    remaining: Math.max(limit - existing.count, 0),
    resetAt: existing.resetAt,
  };
}

export function getRateLimitHeaders(result: ReturnType<typeof consumeRateLimit>) {
  return {
    "Retry-After": String(Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 1)),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
  };
}

function cleanupExpired(now: number) {
  if (store.size < 5000) {
    return;
  }

  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
}
