# Infinite Site

Next.js (App Router) project that auto-generates simple, sanitized HTML pages for any slug at runtime, streams Markdown to the browser as it is produced, then caches the final HTML for subsequent requests.

## Goal & Scope
- Generate a structured content page for `/some-topic` on first request, then serve cached HTML thereafter.
- MVP intentionally excludes external browsing, images, auth, admin UI, and SEO indexing.

## Stack
- Next.js 15 (App Router) with TypeScript (Node 18+).
- Content generation via OpenAI (`openai` npm, model `gpt-4o-mini`) using Responses streaming.
- Markdown parsing with `marked`; sanitization with `dompurify` + `jsdom`.
- Client-side streaming view powered by `EventSource`.
- Caching through `lru-cache` (max 512 entries, indefinite TTL); rate limiting via `rate-limiter-flexible`.
- UX helpers for live cache insights.

Install core dependencies:

```bash
npm i next react react-dom typescript openai marked dompurify jsdom zod lru-cache rate-limiter-flexible
```

## Environment
- `OPENAI_API_KEY` is required.
- Set `NODE_ENV=production` in production deployments.
- Next.js config remains default; ensure `export const dynamic = "force-dynamic"` on the catch-all route.
- Deployment target: Vercel or any Node host.

## Routing Rules
- Handle routes at `/[slug]` where the slug matches `^[a-z0-9-]{1,100}$`.
- Normalize incoming slugs by lowercasing, turning spaces/underscores into hyphens, and collapsing consecutive hyphens.

## Prompting
- System: instruct model to return a timeless, factual Markdown article (H1 title, short summary paragraph, multiple H2 sections, final disclaimer).
- User: `Topic: "<topic>"` and request Markdown only.
- Request params: `model: "gpt-4o-mini"`, `temperature: 0.2`, streaming via `client.responses.stream`.

## Rendering Pipeline
1. Normalize and validate slug to topic string.
2. Check the in-memory LRU cache; hit returns stored HTML instantly.
3. On miss, render a client-side streaming view that opens an SSE connection to `/api/stream/[slug]`.
4. The API route streams Markdown deltas from OpenAI in real time, relaying each chunk to the client and accumulating the full document server-side.
5. Once the stream completes, sanitize the Markdown via `marked` + `dompurify`, wrap it in the shared HTML template, cache the HTML/metadata (indefinite TTL, max 512 entries), and close the SSE stream.
6. Subsequent requests reuse the cached HTML; the reset button or per-page regenerate action clears the cache entry on demand.

## Error Handling & Observability
- Invalid slug → friendly error page rendered via Markdown template.
- Streaming errors emit SSE notifications and fall back to a simple Markdown message, with a retry button that clears the cached slug and reconnects.
- Server enforces 5 requests/minute per IP on the streaming route (429 if exceeded).
- Console logs capture slug, cache hits, latency, token usage (when provided), and streaming state.

## File Layout
- `app/[slug]/page.tsx` – server route: validate slug, render cache hits, fall back to the streaming client.
- `app/api/stream/[slug]/route.ts` – SSE endpoint that streams OpenAI Markdown and caches the final page.
- `lib/generator.ts` – OpenAI client + streaming helpers.
- `lib/render.ts` – Markdown → sanitized HTML template.
- `lib/cache.ts` – LRU instance & TTL configuration.
- `lib/slug.ts` – normalization & validation helpers.
- `components/TopicSearch.tsx` – client search bar on the home page that normalizes topics and routes to the matching slug.
- `components/RecentTopics.tsx` – shows the latest generated slugs (synced to `localStorage`).
- `components/CacheInspector.tsx` – polls `/api/cache` to display cache fill state and latest cached entries.
- `components/NavBar.tsx` – sticky navigation with a compact search form that routes to any slug.
- `components/CachedPageView.tsx` – renders cached topics with metadata and a regenerate button.
- `components/ResetCacheButton.tsx` – clears the LRU cache via `/api/reset-cache`.
- `public/favicon.ico` – site icon served as the default Next.js favicon.

## Local Development
```bash
echo "OPENAI_API_KEY=sk-..." >> .env.local
npm run dev
npm run build && npm start
```

## Acceptance Criteria
- Visiting `/the-titanic` yields a compact, styled HTML article with varied sections (lists/tables) and the disclaimer.
- Second request hits cache (visible via logs, cache inspector, and page metadata).
- Recent topics list and cache inspector update automatically after generation.
- Regenerate button on cached pages clears the entry and streams a fresh version that becomes the new cached copy.
- Invalid slugs respond with friendly error.
- Rate limiting returns HTTP 429 after 5 requests per minute per IP.
- No unsanitized model HTML reaches the client.
