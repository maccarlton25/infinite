export type LocalCacheEntry = {
  slug: string;
  html: string;
  markdown: string;
  title: string;
  description: string;
  lastUpdated: string;
  tokens?: number | null;
};

const CACHE_KEY = 'pageCache';
export const MAX_CACHE_ENTRIES = 512;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function loadCache(): LocalCacheEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => typeof entry?.slug === 'string');
  } catch {
    return [];
  }
}

export function getCachedEntry(slug: string): LocalCacheEntry | null {
  if (!isBrowser()) return null;
  return loadCache().find((entry) => entry.slug === slug) ?? null;
}

export function upsertCachedEntry(entry: LocalCacheEntry) {
  if (!isBrowser()) return;
  try {
    const cache = loadCache().filter((item) => item.slug !== entry.slug);
    cache.unshift(entry);
    while (cache.length > MAX_CACHE_ENTRIES) {
      cache.pop();
    }
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    window.dispatchEvent(new Event('cache:update'));
  } catch (error) {
    console.warn('Failed to persist page cache', error);
  }
}

export function removeCachedEntry(slug: string) {
  if (!isBrowser()) return;
  try {
    const cache = loadCache().filter((item) => item.slug !== slug);
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    window.dispatchEvent(new Event('cache:update'));
  } catch (error) {
    console.warn('Failed to remove cache entry', error);
  }
}

export function clearCache() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(CACHE_KEY);
    window.dispatchEvent(new Event('cache:update'));
  } catch (error) {
    console.warn('Failed to clear cache', error);
  }
}
