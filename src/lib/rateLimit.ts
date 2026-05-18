type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
};

export function rateLimit({ maxRequests, windowMs }: RateLimitOptions) {
  const hits = new Map<string, number[]>();

  return function checkLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const windowStart = now - windowMs;

    const timestamps = (hits.get(ip) || []).filter(t => t > windowStart);
    hits.set(ip, timestamps);

    if (timestamps.length >= maxRequests) {
      const oldestInWindow = timestamps[0];
      return {
        allowed: false,
        retryAfterMs: oldestInWindow + windowMs - now
      };
    }

    timestamps.push(now);
    return { allowed: true };
  };
}

// 10 peticiones por minuto por IP para renders
export const renderRateLimit = rateLimit({ maxRequests: 10, windowMs: 60_000 });

// 30 peticiones por minuto por IP para generate
export const generateRateLimit = rateLimit({ maxRequests: 30, windowMs: 60_000 });
