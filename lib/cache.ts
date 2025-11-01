import { LRUCache } from 'lru-cache';

export interface CachedPage {
  markdown: string;
  html: string;
  title: string;
  description: string;
  lastUpdated: string;
  tokens?: number;
  at: number;
}

const globalForCache = globalThis as typeof globalThis & {
  __infiniteSiteCache?: LRUCache<string, CachedPage>;
};

const cache =
  globalForCache.__infiniteSiteCache ??
  new LRUCache<string, CachedPage>({
    max: 512,
    ttl: 0,
    allowStale: false,
    updateAgeOnGet: true,
    updateAgeOnHas: true
  });

if (!globalForCache.__infiniteSiteCache) {
  globalForCache.__infiniteSiteCache = cache;
}

export function getCachedPage(slug: string) {
  return cache.get(slug);
}

export function setCachedPage(slug: string, value: CachedPage) {
  cache.set(slug, value);
}

export function getCacheStats() {
  const entries = Array.from(cache.entries())
    .slice(0, 20)
    .map(([slug, value]) => ({
      slug,
      title: value.title,
      lastUpdated: value.lastUpdated
    }));

  return {
    size: cache.size,
    max: cache.max,
    entries
  };
}

export function resetCache() {
  cache.clear();
}

export function deleteCachedPage(slug: string) {
  cache.delete(slug);
}
