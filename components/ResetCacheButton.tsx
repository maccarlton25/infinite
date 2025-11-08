'use client';

import { useState, useTransition } from 'react';
import { clearCache, loadCache, MAX_CACHE_ENTRIES } from '../lib/localCache';

export function ResetCacheButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleReset = () => {
    startTransition(() => {
      setMessage(null);

      try {
        clearCache();
        const remaining = loadCache().length;
        setMessage(`Cache cleared. Current size: ${remaining}/${MAX_CACHE_ENTRIES}`);
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
    <div className="reset-cache">
      <button
        type="button"
        onClick={handleReset}
        disabled={isPending}
        className="reset-cache__button"
      >
        {isPending ? 'Resetting…' : 'Reset Cache'}
      </button>
      {message && (
        <p
          className={[
            'reset-cache__message',
            message.startsWith('Reset failed')
              ? 'reset-cache__message--error'
              : null
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {message}
        </p>
      )}
    </div>
  );
}
