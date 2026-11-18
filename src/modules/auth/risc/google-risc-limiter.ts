import { Injectable } from '@nestjs/common';
import {
  GOOGLE_RISC_RATE_LIMIT_GLOBAL,
  GOOGLE_RISC_RATE_LIMIT_PER_IP,
  GOOGLE_RISC_RATE_LIMIT_WINDOW_MS,
} from './google-risc.constants.js';

@Injectable()
export class GoogleRiscLimiter {
  private readonly entries = new Map<string, { count: number; end: number }>();

  check(
    key: string,
    limit: number,
    windowMs: number,
    increment = true,
  ): number {
    const now = Date.now();
    for (const [k, v] of this.entries) if (v.end <= now) this.entries.delete(k);
    let entry = this.entries.get(key);
    if (!entry) {
      if (this.entries.size >= 10_000) return 60;
      entry = { count: 0, end: now + windowMs };
      this.entries.set(key, entry);
    }
    if (increment) entry.count++;
    if (entry.count >= (increment ? limit + 1 : limit))
      return Math.max(1, Math.ceil((entry.end - now) / 1000));
    return 0;
  }

  /** Seconds until retry, or 0 when allowed. */
  checkReceive(ip: string | undefined): number {
    const client = ip ?? 'unknown';
    const globalRetry = this.check(
      'risc:global',
      GOOGLE_RISC_RATE_LIMIT_GLOBAL,
      GOOGLE_RISC_RATE_LIMIT_WINDOW_MS,
    );
    if (globalRetry) return globalRetry;
    return this.check(
      `risc:ip:${client}`,
      GOOGLE_RISC_RATE_LIMIT_PER_IP,
      GOOGLE_RISC_RATE_LIMIT_WINDOW_MS,
    );
  }
}