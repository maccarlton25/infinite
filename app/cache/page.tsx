import Link from 'next/link';
import { CacheInspector } from '../../components/CacheInspector';
import { ResetCacheButton } from '../../components/ResetCacheButton';
import { MAX_CACHE_ENTRIES } from '../../lib/localCache';

export const metadata = {
  title: 'Cache | Infinite Site',
  description:
    'Explore the local LRU cache used by Infinite Site and regenerate any cached topic.'
};

export default function CachePage() {
  return (
    <main className="cache-page">
      <section className="cache-hero">
        <h1>Local Cache Overview</h1>
        <p>
          Infinite Site stores up to <strong>{MAX_CACHE_ENTRIES}</strong> generated
          pages directly in your browser using a Least Recently Used (LRU)
          strategy. Newer pages push out the oldest when the limit is reached,
          so cached pages stay instant without relying on server memory.
        </p>
        <p className="muted">
          Need another topic? Head back to{' '}
          <Link href="/" className="link">
            the generator
          </Link>{' '}
          and stream a fresh page.
        </p>
      </section>

      <section className="cache-status">
        <h2>Cached pages</h2>
        <CacheInspector />
        <ResetCacheButton />
      </section>
    </main>
  );
}
