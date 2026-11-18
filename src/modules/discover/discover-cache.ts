import {
  DISCOVER_CACHE_MAX_ENTRIES,
  DISCOVER_CACHE_TTL_MS,
} from './discover.config.js';

type CacheEntry<T> = { value: T; expiresAt: number; version: number };

/** Global discover cache bust counter (aggregate caches use version in keys). */
let discoverVersion = 0;

const store = new Map<string, CacheEntry<unknown>>();

export function getDiscoverVersion(): number {
  return discoverVersion;
}

export function bumpDiscoverVersion(): void {
  discoverVersion += 1;
}

export function resetDiscoverVersionForTests(): void {
  discoverVersion = 0;
  store.clear();
}

function pruneExpired(now: number): void {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}

export function discoverCacheGet<T>(key: string): T | undefined {
  const now = Date.now();
  pruneExpired(now);
  const entry = store.get(key);
  if (!entry || entry.expiresAt <= now) {
    if (entry) store.delete(key);
    return undefined;
  }
  if (entry.version !== discoverVersion) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function discoverCacheSet<T>(
  key: string,
  value: T,
  ttlMs: number = DISCOVER_CACHE_TTL_MS,
): void {
  const now = Date.now();
  pruneExpired(now);
  if (store.size >= DISCOVER_CACHE_MAX_ENTRIES && !store.has(key)) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
  store.set(key, {
    value,
    expiresAt: now + ttlMs,
    version: discoverVersion,
  });
}