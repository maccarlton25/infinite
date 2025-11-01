'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { isValidSlug, normalizeSlug } from '../lib/slug';

export function TopicSearch() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeSlug(input);
    if (!normalized || !isValidSlug(normalized)) {
      setError(
        'Use lowercase letters, numbers, or hyphens (max 100 characters).'
      );
      return;
    }
    setError(null);
    setInput('');
    router.push(`/${normalized}`);
  };

  return (
    <form className="topic-search" onSubmit={onSubmit}>
      <label htmlFor="topic-input" className="topic-search__label">
        Generate a topic page
      </label>
      <div className="topic-search__input-wrap">
        <input
          id="topic-input"
          type="text"
          placeholder="e.g. The Titanic"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          autoComplete="off"
          spellCheck="false"
          className="topic-search__input"
        />
        <button type="submit" className="topic-search__button">
          Generate
        </button>
      </div>
      {error && <p className="topic-search__error">{error}</p>}
    </form>
  );
}
