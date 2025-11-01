'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'recentTopics';
const MAX_TOPICS = 20;

type TopicEntry = {
  slug: string;
  title?: string;
  seenAt: number;
};

export function RecentTopics() {
  const [topics, setTopics] = useState<TopicEntry[]>([]);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
    []
  );

  useEffect(() => {
    const readTopics = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setTopics([]);
          return;
        }
        const parsed = JSON.parse(raw) as TopicEntry[];
        setTopics(
          parsed
            .filter((entry) => entry && typeof entry.slug === 'string')
            .slice(0, MAX_TOPICS)
        );
      } catch (error) {
        console.warn('Failed to read recent topics', error);
      }
    };

    readTopics();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== STORAGE_KEY) {
        return;
      }
      readTopics();
    };

    const handleCustom = () => readTopics();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('recent-topics:update', handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('recent-topics:update', handleCustom);
    };
  }, []);

  if (!topics.length) {
    return null;
  }

  return (
    <section className="recent-topics">
      <h2>Recent topics</h2>
      <ul>
        {topics.map((topic) => (
          <li key={topic.slug}>
            <Link href={`/${topic.slug}`} prefetch={false}>
              {topic.title ?? topic.slug.replace(/-/g, ' ')}
            </Link>
            <span className="meta">
              {formatter.format(new Date(topic.seenAt))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
