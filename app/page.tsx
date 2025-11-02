import Link from 'next/link';
import { TopicSearch } from '../components/TopicSearch';
import { RecentTopics } from '../components/RecentTopics';

export default function HomePage() {
  return (
    <main className="home-page">
      <section className="hero">
        <h1>Infinite Site</h1>
        <p>
          Generate on-demand topic pages by visiting <code>/some-topic-slug</code>. Content streams live
          on first visit and is served instantly from cache thereafter until you regenerate.
        </p>
      </section>
      <TopicSearch />
      <section className="tech-overview">
        <h2>Technical overview</h2>
        <ul>
          <li>
            Next.js App Router with server actions streams OpenAI Responses
            (JSON mode) directly to the browser via Server-Sent Events.
          </li>
          <li>
            Each completion is sanitized with <code>marked</code> +
            <code>dompurify</code> and cached in browser localStorage using a
            512-entry LRU so repeat visits stay instant and work offline.
          </li>
          <li>
            Interface is fully serverless: retry/regenerate controls, cache
            viewer (<Link href="/cache">cache page</Link>), and topic history are
            all client-side and sync via custom events.
          </li>
        </ul>
      </section>
      <RecentTopics />
    </main>
  );
}
