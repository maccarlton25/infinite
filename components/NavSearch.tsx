'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { normalizeSlug, isValidSlug } from '../lib/slug';

export function NavSearch() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeSlug(value);
    if (!normalized || !isValidSlug(normalized)) {
      setError('Use lowercase letters, numbers, or hyphens.');
      return;
    }
    setError(null);
    setValue('');
    router.push(`/${normalized}`);
  };

  return (
    <form className="site-nav__search" onSubmit={onSubmit}>
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search or generate topic…"
        spellCheck="false"
        autoComplete="off"
        className="site-nav__input"
        aria-label="Search for a topic"
      />
      <button type="submit" className="site-nav__search-btn">
        Go
      </button>
      {error && <span className="site-nav__search-error">{error}</span>}
    </form>
  );
}
