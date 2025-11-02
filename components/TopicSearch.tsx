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
      setError('Use lowercase letters, numbers, or hyphens.');
      return;
    }
    setError(null);
    setInput('');
    router.push(`/${normalized}`);
  };

  return (
    <form className="topic-search" onSubmit={onSubmit}>
      <div className="topic-search__input-wrap">
        <input
          id="topic-input"
          type="text"
          placeholder="Try “the-titanic”"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          autoComplete="off"
          spellCheck="false"
          className="topic-search__input"
          aria-label="Generate a topic page"
        />
        <button type="submit" className="topic-search__button">
          Generate
        </button>
      </div>
      {error && <p className="topic-search__error">{error}</p>}
    </form>
  );
}
