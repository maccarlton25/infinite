import type { Metadata } from 'next';
import {
  assertValidSlug,
  InvalidSlugError,
  topicFromSlug
} from '../../lib/slug';
import { renderMarkdownPage } from '../../lib/render';
import { StreamingViewer } from '../../components/StreamingViewer';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  try {
    const slug = assertValidSlug(rawSlug);
    const topic = topicFromSlug(slug);
    const title = `Generating ${topic}`;

    return {
      title,
      robots: {
        index: false,
        follow: false
      }
    };
  } catch (error) {
    if (error instanceof InvalidSlugError) {
      return {
        title: 'Invalid topic slug',
        description:
          'Slugs must use lowercase letters, digits, and hyphens only.',
        robots: {
          index: false,
          follow: false
        }
      };
    }
    console.error('Metadata generation failed', error);
    return {
      title: 'Unable to generate page',
      robots: {
        index: false,
        follow: false
      }
    };
  }
}

export default async function TopicPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  let slug: string;
  let topic: string;
  try {
    slug = assertValidSlug(rawSlug);
    topic = topicFromSlug(slug);
  } catch (error) {
    if (error instanceof InvalidSlugError) {
      const html = buildInvalidSlugHtml(rawSlug);
      return (
        <div
          dangerouslySetInnerHTML={{ __html: html }}
          suppressHydrationWarning
        />
      );
    }

    console.error('Unexpected topic page failure', error);
    const html = buildFallbackHtml(rawSlug);
    return (
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        suppressHydrationWarning
      />
    );
  }

  logRequest({
    slug,
    streamed: true
  });

  return <StreamingViewer slug={slug} topic={topic} />;
}

function logRequest(entry: { slug: string; streamed?: boolean }) {
  console.log(
    JSON.stringify({
      slug: entry.slug,
      streamed: entry.streamed ?? false,
      at: new Date().toISOString()
    })
  );
}

function buildInvalidSlugHtml(rawSlug: string) {
  const markdown = [
    '# Invalid topic slug',
    '',
    'The topic you requested does not match the allowed pattern (lowercase letters, numbers, hyphens).',
    '',
    '## Allowed format',
    '',
    'Slugs must match `^[a-z0-9-]{1,100}$`. Replace spaces or underscores with hyphens.',
    '',
    '## Example',
    '',
    'Try visiting `/the-titanic` once the service is configured.'
  ].join('\n');
  return renderMarkdownPage('invalid-request', markdown).html;
}

function buildFallbackHtml(slug: string) {
  const markdown = [
    '# We could not generate this page',
    '',
    'Something went wrong while streaming this topic. Please try again soon.',
    '',
    '## What you can do',
    '',
    '- Reload this page in a few minutes.',
    '- Confirm your OpenAI API key and network connectivity.',
    '- Check the server logs for more details.'
  ].join('\n');
  return renderMarkdownPage(slug, markdown).html;
}
