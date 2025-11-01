'use client';

import { useState, useTransition } from 'react';

export function ResetCacheButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleReset = () => {
    startTransition(async () => {
      setMessage(null);

      try {
        const response = await fetch('/api/reset-cache', {
          method: 'POST'
        });

        if (!response.ok) {
          throw new Error(`Reset failed with status ${response.status}`);
        }

        const result = await response.json();
        setMessage(
          `Cache cleared. Current size: ${result.cache?.size ?? 0}/${result
            .cache?.max ?? 0}`
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? `Reset failed: ${error.message}`
            : 'Reset failed unexpectedly.'
        );
      }
    });
  };

  return (
    <div style={{ marginTop: '48px' }}>
      <button
        type="button"
        onClick={handleReset}
        disabled={isPending}
        style={{
          background: '#38bdf8',
          color: '#0f172a',
          border: 'none',
          borderRadius: '999px',
          padding: '12px 24px',
          fontWeight: 600,
          cursor: isPending ? 'wait' : 'pointer',
          boxShadow: '0 10px 25px rgba(56, 189, 248, 0.35)'
        }}
      >
        {isPending ? 'Resetting…' : 'Reset Cache'}
      </button>
      {message && (
        <p
          style={{
            marginTop: '16px',
            fontSize: '0.95rem',
            color: message.startsWith('Reset failed') ? '#f87171' : '#94a3b8'
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
