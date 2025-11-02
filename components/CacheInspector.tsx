'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadCache, MAX_CACHE_ENTRIES } from '../lib/localCache';

type CacheStats = {
  size: number;
  entries: { slug: string; title: string; lastUpdated: string }[];
};

export function CacheInspector() {
  const [data, setData] = useState<CacheStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadStats = useCallback(() => {
    setIsLoading(true);
    try {
      const cache = loadCache();
      setData({
        size: cache.length,
        entries: cache.map(({ slug, title, lastUpdated }) => ({
          slug,
          title,
          lastUpdated
        }))
      });
      setError(null);
      setLastRefresh(Date.now());
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load cache status.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    intervalRef.current = setInterval(() => {
      loadStats();
    }, 15_000);

    const handleUpdate = () => loadStats();
    window.addEventListener('cache:update', handleUpdate);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('cache:update', handleUpdate);
    };
  }, [loadStats]);

  const usagePercent =
    data && MAX_CACHE_ENTRIES > 0
      ? Math.min(100, Math.round((data.size / MAX_CACHE_ENTRIES) * 100))
      : 0;

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
    []
  );

  return (
    <section className="cache-inspector">
      <div className="cache-inspector__header">
        <h2>Cache status</h2>
        <button type="button" onClick={loadStats} disabled={isLoading}>
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {error && <p className="cache-inspector__error">{error}</p>}
      {data ? (
        <div className="cache-inspector__content">
          <p>
            <strong>{data.size}</strong> of {MAX_CACHE_ENTRIES} slots used
            {lastRefresh && (
              <span className="muted">
                {' '}
                • updated {formatter.format(new Date(lastRefresh))}
              </span>
            )}
          </p>
          <div className="cache-inspector__bar" role="presentation">
            <span
              className="cache-inspector__bar-fill"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {data.entries.length ? (
            <ul className="cache-inspector__list">
              {data.entries.map((entry) => (
                <li key={entry.slug}>
                  <span>{entry.title || entry.slug.replace(/-/g, ' ')}</span>
                  <span className="meta">{entry.slug}</span>
                  <span className="meta">
                    {formatter.format(new Date(entry.lastUpdated))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Cache is empty.</p>
          )}
        </div>
      ) : (
        !error && <p className="muted">Loading cache details…</p>
      )}
    </section>
  );
}
