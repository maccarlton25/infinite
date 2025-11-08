import Link from 'next/link';
import { TopicSearch } from '../components/TopicSearch';
import { RecentTopics } from '../components/RecentTopics';

export default function HomePage() {
  return (
    <main className="home-page">
      <section className="hero">
        <h1>Infinite Site</h1>
        <p>Type any URL slug (i.e. https://infinite-three-gray.vercel.app/what-is-quantum) and watch a 
          wiki-style page automatically get generated.</p>
        <p>
          This site builds pages by streaming LLM responses (in Markdown). I use custom rendering 
          scripts to derive, sanitize, and render pages in real time.
        </p>
        <p>
          I also implemented a localStorage LRU cache. Mostly for fun and to help with testing. 
        </p>
      </section>
      <TopicSearch />
      {/* <section className="tech-overview">
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
      </section> */}
      <RecentTopics />
    </main>
  );
}
