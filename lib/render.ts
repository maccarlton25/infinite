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
          color-scheme: light;
        }
        .page {
          min-height: 100vh;
          background: transparent;
          color: #2d2614;
          padding: 12px 0 32px;
          font-family: 'Iowan Old Style', 'Merriweather', 'Georgia', serif;
          letter-spacing: 0.01em;
        }
        .wrap {
          max-width: 860px;
          margin: 0 auto;
          background: #f8f1e2;
          border: 1px solid #d8c7a4;
          border-radius: 18px;
          box-shadow: 0 18px 48px rgba(74, 51, 23, 0.16);
          padding: clamp(28px, 5vw, 48px);
        }
        .content {
          line-height: 1.7;
        }
        .content > * + * {
          margin-top: 18px;
        }
        .content h1:first-of-type {
          font-size: clamp(2rem, 3.4vw, 2.85rem);
          margin: 0 0 12px;
          letter-spacing: 0.04em;
          text-transform: capitalize;
        }
        .content p {
          line-height: 1.7;
          margin: 0;
        }
        .content h2 {
          margin: 26px 0 8px;
          font-size: 1.35rem;
          border-bottom: 1px solid #d8c7a4;
          padding-bottom: 6px;
        }
        .content h3 {
          margin-top: 20px;
          margin-bottom: 6px;
          font-size: 1.15rem;
        }
        .content ul,
        .content ol {
          margin: 0 0 0 24px;
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
          border: 1px solid #d8c7a4;
          padding: 8px 12px;
          text-align: left;
        }
        .content table th {
          background: #efe2c3;
        }
        .content blockquote {
          margin: 16px 0;
          padding: 12px 18px;
          border-left: 4px solid #c09543;
          background: rgba(192, 149, 67, 0.12);
          color: #5c4d2d;
        }
        .content pre {
          background: #efe2c3;
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid #d8c7a4;
          overflow-x: auto;
          font-size: 0.92rem;
        }
        .content code {
          font-family: 'Berkeley Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
          background: rgba(239, 226, 195, 0.9);
          border: 1px solid rgba(216, 199, 164, 0.8);
          border-radius: 4px;
          padding: 0 4px;
        }
        footer {
          margin-top: 32px;
          font-size: 0.85rem;
          color: #5c4d2d;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        footer .meta {
          font-size: 0.8rem;
        }
        a {
          color: #8b6b32;
          text-decoration: underline;
        }
        @media (max-width: 640px) {
          .wrap {
            padding: 24px 18px;
          }
          .content h2 {
            font-size: 1.22rem;
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
