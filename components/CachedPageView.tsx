'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function formatTimestamp(value: string | null | undefined) {
  try {
    if (!value) return '—';
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return value ?? '—';
  }
}

interface Props {
  slug: string;
  html: string;
  lastUpdated: string;
  tokens?: number | null;
}

export function CachedPageView({ slug, html, lastUpdated, tokens }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/cache/${encodeURIComponent(slug)}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`Failed to reset cache (status ${response.status})`);
      }
      router.refresh();
    } catch (err) {
      setRegenerating(false);
      setError(
        err instanceof Error ? err.message : 'Unable to regenerate right now.'
      );
    }
  };

  return (
    <div className="cached-page-container">
      <div className="cached-page-toolbar">
        <div className="cached-page-meta">
          <span>Cached · {formatTimestamp(lastUpdated)}</span>
          {tokens != null && <span>Tokens: {tokens}</span>}
        </div>
        <button
          type="button"
          className="cached-page-button"
          onClick={handleRegenerate}
          disabled={regenerating}
        >
          {regenerating ? 'Regenerating…' : 'Regenerate'}
        </button>
      </div>
      {error && <p className="cached-page-error">{error}</p>}
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        suppressHydrationWarning
      />
    </div>
  );
}
