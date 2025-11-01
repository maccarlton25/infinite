'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

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
  const statusRef = useRef<'idle' | 'streaming' | 'complete' | 'error'>('idle');
  const startTimeRef = useRef<number | null>(null);

  const updateStatus = (next: 'idle' | 'streaming' | 'complete' | 'error') => {
    statusRef.current = next;
    setStatus(next);
  };

  useEffect(() => {
    setMarkdown('');
    updateStatus('streaming');
    setPhase('Connecting…');
    setElapsedMs(0);
    setError(null);
    setCompleteMeta(null);
    setFinalHtml(null);
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
  }, [slug, reloadToken]);

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

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/cache/${encodeURIComponent(slug)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error(`Failed to reset cache (status ${res.status})`);
      }
      setError(null);
    } catch (err) {
      console.warn('Failed to clear cache before retry', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Retry failed to reset the cache entry.'
      );
      return;
    } finally {
      setIsRetrying(false);
    }
    setReloadToken((token) => token + 1);
  };

  const sanitizedHtml = useMemo(() => sanitizeMarkdown(markdown), [markdown]);

  const disclaimer =
    'This page was generated automatically and may contain inaccuracies.';

  if (finalHtml) {
    return (
      <div
        dangerouslySetInnerHTML={{ __html: finalHtml }}
        suppressHydrationWarning
      />
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
    localStorage.setItem(key, JSON.stringify(filtered.slice(0, 20)));
    window.dispatchEvent(new Event('recent-topics:update'));
  } catch (error) {
    console.warn('Failed to persist recent topic', error);
  }
}
