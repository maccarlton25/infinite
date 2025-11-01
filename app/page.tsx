import Link from 'next/link';
import { ResetCacheButton } from '../components/ResetCacheButton';
import { TopicSearch } from '../components/TopicSearch';
import { RecentTopics } from '../components/RecentTopics';
import { CacheInspector } from '../components/CacheInspector';

export default function HomePage() {
  return (
    <main className="home-page">
      <section className="hero">
        <h1>Infinite Site</h1>
        <p>
          Generate on-demand topic pages by visiting <code>/some-topic-slug</code>. Content is
          streamed live on first visit and served from cache for 24 hours thereafter.
        </p>
      </section>
      <TopicSearch />
      <RecentTopics />
      <CacheInspector />
      {/* <ResetCacheButton /> */}
    </main>
  );
}
