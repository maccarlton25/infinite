import { marked } from 'marked';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { topicFromSlug } from './slug';

const jsdom = new JSDOM('<!DOCTYPE html>');
const domWindow = jsdom.window as unknown as Window & typeof globalThis;
const DOMPurify = createDOMPurify(domWindow);

marked.setOptions({
  gfm: true
});

export interface RenderedMarkdownPage {
  html: string;
  title: string;
  description: string;
  lastUpdated: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function deriveTitle(slug: string, markdown: string): string {
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  if (titleMatch?.[1]) {
    return titleMatch[1].trim().slice(0, 120);
  }
  const topic = topicFromSlug(slug);
  return topic
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .slice(0, 120);
}

function deriveDescription(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('>')) {
      return trimmed.replace(/^>\s*/, '').slice(0, 280);
    }
    return trimmed.slice(0, 280);
  }
  return 'Generated content';
}

function sanitizeMarkdown(markdown: string) {
  const raw = marked.parse(markdown);
  const html = typeof raw === 'string' ? raw : '';
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

export function renderMarkdownPage(
  slug: string,
  markdown: string,
  {
    timestamp = new Date().toISOString(),
    disclaimer = 'This page was generated automatically and may contain inaccuracies.'
  }: { timestamp?: string; disclaimer?: string } = {}
): RenderedMarkdownPage {
  const title = deriveTitle(slug, markdown);
  const description = deriveDescription(markdown);
  const body = sanitizeMarkdown(markdown);
  const topicUrlBase =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    'https://infinite-site.local';
  const canonicalUrl = `${topicUrlBase}/${slug}`;

  const html = `
    <div class="page">
      <style>
        :root {
          color-scheme: dark;
        }
        .page {
          min-height: 100vh;
          background: radial-gradient(circle at top, #1f2937, #020617);
          color: #f8fafc;
          padding: 48px 14px 72px;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .wrap {
          max-width: 860px;
          margin: 0 auto;
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 16px;
          box-shadow: 0 18px 40px rgba(2, 6, 23, 0.55);
          backdrop-filter: blur(12px);
          padding: clamp(24px, 5vw, 40px);
        }
        .content > * + * {
          margin-top: 16px;
        }
        .content h1:first-of-type {
          font-size: clamp(1.9rem, 3.6vw, 2.65rem);
          margin-bottom: 12px;
          letter-spacing: -0.025em;
        }
        .content p {
          line-height: 1.6;
          margin: 0;
        }
        .content h2 {
          margin-top: 24px;
          margin-bottom: 8px;
          font-size: 1.4rem;
        }
        .content h3 {
          margin-top: 18px;
          margin-bottom: 6px;
          font-size: 1.15rem;
        }
        .content ul,
        .content ol {
          margin: 0 0 0 20px;
          padding: 0;
        }
        .content li {
          margin-bottom: 6px;
        }
        .content table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.95rem;
        }
        .content table th,
        .content table td {
          border: 1px solid rgba(148, 163, 184, 0.25);
          padding: 8px 12px;
          text-align: left;
        }
        .content blockquote {
          margin: 14px 0;
          padding: 8px 16px;
          border-left: 3px solid rgba(59, 130, 246, 0.6);
          color: #cbd5f5;
          background: rgba(30, 41, 59, 0.4);
        }
        .content pre {
          background: rgba(15, 23, 42, 0.65);
          padding: 12px 16px;
          border-radius: 10px;
          overflow-x: auto;
          font-size: 0.9rem;
        }
        .content code {
          font-family: 'Fira Code', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        }
        footer {
          margin-top: 28px;
          font-size: 0.82rem;
          color: #94a3b8;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        footer .meta {
          font-size: 0.78rem;
        }
        a {
          color: #38bdf8;
        }
        @media (max-width: 640px) {
          .wrap {
            padding: 24px 18px;
          }
          .content h2 {
            font-size: 1.25rem;
          }
        }
      </style>
      <div class="wrap">
        <article class="content" aria-label="${escapeHtml(title)}">
          ${body}
        </article>
        <footer>
          <p>${escapeHtml(disclaimer)}</p>
          <p class="meta">Last updated: ${escapeHtml(
            timestamp
          )} • Cache key: ${escapeHtml(slug)}</p>
          <p class="meta"><a href="${escapeHtml(
            canonicalUrl
          )}" rel="nofollow">Permanent link</a></p>
        </footer>
      </div>
      <script>
        (() => {
          try {
            const key = 'recentTopics';
            const entry = {
              slug: ${JSON.stringify(slug)},
              title: ${JSON.stringify(title)},
              seenAt: Date.now()
            };
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : [];
            const list = Array.isArray(parsed) ? parsed : [];
            const filtered = list.filter((item) => item && item.slug !== entry.slug);
            filtered.unshift(entry);
            localStorage.setItem(key, JSON.stringify(filtered.slice(0, 6)));
            window.dispatchEvent(new Event('recent-topics:update'));
          } catch (error) {
            console.warn('Failed to persist recent topics', error);
          }
        })();
      </script>
    </div>
  `;

  return {
    html,
    title,
    description,
    lastUpdated: timestamp
  };
}
