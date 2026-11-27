import { Injectable } from '@nestjs/common';
import {
  RATE_LIMIT_ATTEMPT_START_WINDOW_MS,
  rateLimitAttemptStartPerHour,
} from './learning.config.js';

@Injectable()
export class LearningAttemptRateLimiter {
  private readonly entries = new Map<string, { count: number; end: number }>();

  check(userId: string, increment = true): number {
    const key = `attempt_start:${userId}`;
    const now = Date.now();
    for (const [k, v] of this.entries) if (v.end <= now) this.entries.delete(k);
    let entry = this.entries.get(key);
    if (!entry) {
      if (this.entries.size >= 10_000) return 60;
      entry = { count: 0, end: now + RATE_LIMIT_ATTEMPT_START_WINDOW_MS };
      this.entries.set(key, entry);
    }
    if (increment) entry.count++;
    const limit = rateLimitAttemptStartPerHour();
    if (entry.count >= (increment ? limit + 1 : limit)) {
      return Math.max(1, Math.ceil((entry.end - now) / 1000));
    }
    return 0;
  }
}