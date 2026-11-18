import { Injectable } from '@nestjs/common';
import {
  RATE_LIMIT_FOR_YOU_PER_MIN,
  RATE_LIMIT_SEARCH_PER_MIN,
} from './discover.config.js';

const WINDOW_MS = 60_000;

type Bucket = 'search' | 'discover';

@Injectable()
export class DiscoverBucketLimiter {
  private readonly entries = new Map<string, { count: number; end: number }>();

  private limitFor(bucket: Bucket): number {
    return bucket === 'search'
      ? RATE_LIMIT_SEARCH_PER_MIN
      : RATE_LIMIT_FOR_YOU_PER_MIN;
  }

  check(userId: string, bucket: Bucket, increment = true): number {
    const key = `${bucket}:${userId}`;
    const now = Date.now();
    for (const [k, v] of this.entries) if (v.end <= now) this.entries.delete(k);
    let entry = this.entries.get(key);
    if (!entry) {
      if (this.entries.size >= 10_000) return 60;
      entry = { count: 0, end: now + WINDOW_MS };
      this.entries.set(key, entry);
    }
    if (increment) entry.count++;
    const limit = this.limitFor(bucket);
    if (entry.count >= (increment ? limit + 1 : limit)) {
      return Math.max(1, Math.ceil((entry.end - now) / 1000));
    }
    return 0;
  }
}