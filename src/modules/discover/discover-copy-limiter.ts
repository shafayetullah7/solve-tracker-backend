import { Injectable } from '@nestjs/common';
import { RATE_LIMIT_COPY_PER_MIN } from './discover.config.js';

const WINDOW_MS = 60_000;

@Injectable()
export class DiscoverCopyLimiter {
  private readonly entries = new Map<string, { count: number; end: number }>();

  check(userId: string): number {
    const key = `copy:${userId}`;
    const now = Date.now();
    for (const [k, v] of this.entries) if (v.end <= now) this.entries.delete(k);
    let entry = this.entries.get(key);
    if (!entry) {
      if (this.entries.size >= 10_000) return 60;
      entry = { count: 0, end: now + WINDOW_MS };
      this.entries.set(key, entry);
    }
    entry.count++;
    if (entry.count >= RATE_LIMIT_COPY_PER_MIN + 1) {
      return Math.max(1, Math.ceil((entry.end - now) / 1000));
    }
    return 0;
  }
}