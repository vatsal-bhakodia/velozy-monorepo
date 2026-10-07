import type { RequestHandler } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";

export function rateLimit(
  redis: any,
  points: number,
  duration: number,
  key: (request: Parameters<RequestHandler>[0]) => string,
): RequestHandler {
  const limiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: `api:${points}:${duration}`,
    points,
    duration,
  });
  return async (request, response, next) => {
    try {
      await limiter.consume(key(request));
      next();
    } catch {
      response.setHeader("retry-after", String(duration));
      response
        .status(429)
        .json({ error: "Too many requests", code: "rate_limited" });
    }
  };
}
