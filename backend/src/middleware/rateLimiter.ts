import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AppError } from './errorHandler';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.cleanupInterval();
  }

  private cleanupInterval(): void {
    this.cleanupIntervalId = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetTime < now) {
          this.store.delete(key);
        }
      }
    }, this.windowMs);
  }

  destroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    this.store.clear();
  }

  close(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  private getIdentifier(req: Request): string {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  check(req: Request): boolean {
    const identifier = this.getIdentifier(req);
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || entry.resetTime < now) {
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  getRemainingRequests(req: Request): number {
    const identifier = this.getIdentifier(req);
    const entry = this.store.get(identifier);
    if (!entry || entry.resetTime < Date.now()) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(req: Request): number {
    const identifier = this.getIdentifier(req);
    const entry = this.store.get(identifier);
    if (!entry) {
      return Date.now() + this.windowMs;
    }
    return entry.resetTime;
  }
}

// Global registry for tracking all RateLimiter instances
const rateLimiterInstances: Set<RateLimiter> = new Set();

export const createRateLimiter = (maxRequests: number, windowMs: number): RateLimiter => {
  const limiter = new RateLimiter(maxRequests, windowMs);
  rateLimiterInstances.add(limiter);
  return limiter;
};

// Global cleanup function for Jest teardown
export const cleanupAllRateLimiters = (): void => {
  for (const limiter of rateLimiterInstances) {
    limiter.close();
  }
  rateLimiterInstances.clear();
};
export { RateLimiter };

export const rateLimitMiddleware = (rateLimiter: RateLimiter) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!rateLimiter.check(req)) {
      const resetTime = rateLimiter.getResetTime(req);
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        retryAfter
      });

      next(new AppError(`Rate limit exceeded. Try again in ${retryAfter} seconds.`, 429));
      return;
    }

    next();
  };
};