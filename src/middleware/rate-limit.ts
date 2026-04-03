import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimitMiddleware(
  maxAttempts: number = 5,
  windowMs: number = 60_000
): MiddlewareHandler {
  return async (c, next) => {
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const now = Date.now();

    const entry = loginAttempts.get(ip);

    if (entry && now < entry.resetAt) {
      if (entry.count >= maxAttempts) {
        throw new HTTPException(429, {
          message: "Too many login attempts. Please try again later.",
        });
      }
      entry.count++;
    } else {
      loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    }

    await next();
  };
}
