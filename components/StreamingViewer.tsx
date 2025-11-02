'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import {
  getCachedEntry,
  removeCachedEntry,
  upsertCachedEntry,
  type LocalCacheEntry,
  MAX_CACHE_ENTRIES
} from '../lib/localCache';

interface Props {
  slug: string;
  topic: string;
}

interface CompletePayload {
  ok: boolean;
  title?: string;
  description?: string;
  tokens?: number | null;
  html?: string;
  markdown?: string;
}

const sanitizeMarkdown = (markdown: string) => {
  if (!markdown) {
    return '';
  }
  const raw = marked.parse(markdown);
  const html = typeof raw === 'string' ? raw : '';
  return DOMPurify.sanitize(html);
};

export function StreamingViewer({ slug, topic }: Props) {
  const [markdown, setMarkdown] = useState('');
  const [status, setStatus] =
    useState<'idle' | 'streaming' | 'complete' | 'error'>('idle');
  const [phase, setPhase] = useState<string>('Connecting…');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [completeMeta, setCompleteMeta] = useState<CompletePayload | null>(null);
  const [finalHtml, setFinalHtml] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [cachedEntry, setCachedEntry] = useState<LocalCacheEntry | null>(null);
  const [mode, setMode] = useState<'loading' | 'cached' | 'streaming'>('loading');
  const statusRef = useRef<'idle' | 'streaming' | 'complete' | 'error'>('idle');
  const startTimeRef = useRef<number | null>(null);

  const updateStatus = (next: 'idle' | 'streaming' | 'complete' | 'error') => {
    statusRef.current = next;
    setStatus(next);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const entry = getCachedEntry(slug);
    if (entry) {
      setCachedEntry(entry);
      setMode('cached');
      updateStatus('complete');
      setPhase('Cached result');
      setElapsedMs(0);
      setError(null);
      setCompleteMeta({
        ok: true,
        title: entry.title,
        description: entry.description,
        tokens: entry.tokens ?? null
      });
    } else {
      setCachedEntry(null);
      setMode('streaming');
      setError(null);
    }
  }, [slug, reloadToken]);

  useEffect(() => {
    if (mode !== 'streaming') return;

    setMarkdown('');
    setFinalHtml(null);
    updateStatus('streaming');
    setPhase('Connecting…');
    setElapsedMs(0);
    setCompleteMeta(null);
    startTimeRef.current = Date.now();

    const source = new EventSource(
      `/api/stream/${encodeURIComponent(slug)}?t=${reloadToken}`
    );

    source.addEventListener('start', () => {
      updateStatus('streaming');
      setPhase('Streaming content');
    });

    source.addEventListener('chunk', (event) => {
      try {
        const data = JSON.parse(event.data) as { chunk: string };
        setMarkdown((prev) => prev + (data.chunk ?? ''));
      } catch {
        // ignore malformed chunk
      }
    });

    source.addEventListener('complete', (event) => {
      setPhase('Finalizing…');
      updateStatus('complete');
      try {
        const data = JSON.parse(event.data) as CompletePayload;
        setCompleteMeta(data);
        if (data.title) {
          document.title = data.title;
        }
        if (data.markdown) {
          setMarkdown(data.markdown);
        }
        if (data.html) {
          setFinalHtml(data.html);
        }
        setPhase('Complete');

        const entry: LocalCacheEntry = {
          slug,
          html: data.html ?? '',
          markdown: data.markdown ?? markdown,
          title: data.title ?? headingFromTopic(topic),
          description: data.description ?? '',
          lastUpdated: new Date().toISOString(),
          tokens: data.tokens ?? null
        };
        upsertCachedEntry(entry);
        setCachedEntry(entry);
        setMode('cached');
        persistRecentTopic(slug, entry.title);
      } catch {
        // ignore parse issue
      } finally {
        setElapsedMs(
          startTimeRef.current ? Date.now() - startTimeRef.current : 0
        );
        source.close();
      }
    });

    source.addEventListener('server-error', (event) => {
      if (statusRef.current === 'complete') {
        source.close();
        return;
      }
      updateStatus('error');
      setPhase('Error');
      try {
        const data = JSON.parse(
          (event as MessageEvent).data
        ) as { message?: string };
        setError(
          data?.message ??
            'We were unable to stream this topic. Please try again shortly.'
        );
      } catch {
        setError('We were unable to stream this topic. Please try again shortly.');
      } finally {
        source.close();
      }
    });

    source.onerror = () => {
      if (statusRef.current !== 'complete') {
        updateStatus('error');
        setPhase('Error');
        setError('Connection lost while streaming. Please retry.');
      }
      source.close();
    };

    return () => {
      source.close();
      startTimeRef.current = null;
    };
  }, [slug, reloadToken, mode]);

  useEffect(() => {
    if (statusRef.current === 'streaming') {
      const id = window.setInterval(() => {
        if (startTimeRef.current) {
          setElapsedMs(Date.now() - startTimeRef.current);
        }
      }, 200);
      return () => window.clearInterval(id);
    }
    if (statusRef.current === 'complete' && startTimeRef.current) {
      setElapsedMs(Date.now() - startTimeRef.current);
    }
  }, [status]);

  useEffect(() => {
    if (statusRef.current === 'complete') {
      const title = completeMeta?.title ?? headingFromTopic(topic);
      persistRecentTopic(slug, title);
    }
  }, [slug, completeMeta, topic]);

  const handleRetry = () => {
    setIsRetrying(true);
    removeCachedEntry(slug);
    setCachedEntry(null);
    setMode('streaming');
    setReloadToken((token) => token + 1);
    setTimeout(() => setIsRetrying(false), 200);
  };

  const sanitizedHtml = useMemo(() => sanitizeMarkdown(markdown), [markdown]);

  const disclaimer =
    'This page was generated automatically and may contain inaccuracies.';

  if (mode === 'cached' && cachedEntry) {
    return (
      <div className="cached-page-container">
        <div className="cached-page-toolbar">
          <div className="cached-page-meta">
            <span>Cached · {formatTimestamp(cachedEntry.lastUpdated)}</span>
            {cachedEntry.tokens != null && <span>Tokens: {cachedEntry.tokens}</span>}
          </div>
          <button
            type="button"
            className="cached-page-button"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? 'Regenerating…' : 'Regenerate'}
          </button>
        </div>
        <div
          dangerouslySetInnerHTML={{ __html: cachedEntry.html }}
          suppressHydrationWarning
        />
      </div>
    );
  }

  return (
    <main className="streaming-page">
      <div className="streaming-card">
        <div className="streaming-status-bar">
          <span
            className={[
              'status-pill',
              status === 'error'
                ? 'error'
                : status === 'complete'
                ? 'complete'
                : undefined
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {phase}
          </span>
          <span className="elapsed">{formatElapsed(elapsedMs)}</span>
        </div>
        <header>
          <h1>{completeMeta?.title ?? headingFromTopic(topic)}</h1>
          <p>
            {completeMeta?.description ??
              (status === 'complete'
                ? 'Finalizing content…'
                : 'Streaming fresh content.')}
          </p>
        </header>
        <section
          className="streaming-content"
          dangerouslySetInnerHTML={
            finalHtml
              ? { __html: finalHtml }
              : sanitizedHtml
              ? { __html: sanitizedHtml }
              : {
                  __html:
                    '<p><em>Waiting for the first chunks…</em></p>'
                }
          }
        />
        <footer>
          <p>{disclaimer}</p>
          <p className="meta">
            Status:{' '}
            {status === 'streaming'
              ? 'Streaming…'
              : status === 'complete'
              ? 'Complete'
              : 'Error'}
            {completeMeta?.tokens != null
              ? ` • Tokens: ${completeMeta.tokens}`
              : ''}
          </p>
          {error && (
            <p className="meta error">
              {error}{' '}
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                style={{
                  marginLeft: '8px',
                  background: 'transparent',
                  border: '1px solid rgba(248, 113, 113, 0.4)',
                  color: '#f87171',
                  borderRadius: '999px',
                  padding: '4px 12px',
                  fontSize: '0.75rem',
                  cursor: isRetrying ? 'wait' : 'pointer'
                }}
              >
                {isRetrying ? 'Retrying…' : 'Retry'}
              </button>
            </p>
          )}
        </footer>
      </div>
    </main>
  );
}

function headingFromTopic(topic: string) {
  return topic
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatElapsed(ms: number) {
  if (!ms) return '0.0s';
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms.toFixed(0)}ms`;
}

function persistRecentTopic(slug: string, title: string) {
  try {
    const key = 'recentTopics';
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    const entry = { slug, title, seenAt: Date.now() };
    const filtered = list.filter((item: { slug: string }) => item?.slug !== slug);
    filtered.unshift(entry);
    localStorage.setItem(
      key,
      JSON.stringify(filtered.slice(0, MAX_CACHE_ENTRIES))
    );
    window.dispatchEvent(new Event('recent-topics:update'));
  } catch (error) {
    console.warn('Failed to persist recent topic', error);
  }
}

function formatTimestamp(value: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return value;
  }
}
