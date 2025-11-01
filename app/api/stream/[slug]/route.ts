import { NextResponse } from 'next/server';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import {
  assertValidSlug,
  topicFromSlug,
  InvalidSlugError
} from '../../../../lib/slug';
import {
  createMarkdownStream,
  finalizeMarkdownStream,
  GenerationError
} from '../../../../lib/generator';
import { renderMarkdownPage } from '../../../../lib/render';
import { setCachedPage } from '../../../../lib/cache';

const encoder = new TextEncoder();
const rateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60
});

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  let slug: string;
  try {
    slug = assertValidSlug(params.slug);
  } catch (error) {
    if (error instanceof InvalidSlugError) {
      return NextResponse.json(
        { error: 'Invalid slug' },
        { status: 400, headers: sseHeaders }
      );
    }
    throw error;
  }

  const identifier =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'anonymous';

  try {
    await rateLimiter.consume(identifier);
  } catch (error) {
    return sseErrorResponse(
      slug,
      Date.now(),
      'Rate limit exceeded. Please wait a moment and try again.',
      429
    );
  }

  const topic = topicFromSlug(slug);
  const start = Date.now();
  let markdown = '';

  let openAIStream;
  try {
    openAIStream = await createMarkdownStream(topic);
  } catch (error) {
    return sseErrorResponse(
      slug,
      start,
      error instanceof Error ? error.message : 'Failed to contact OpenAI'
    );
  }

  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode('event: start\ndata: {}\n\n'));

      try {
        for await (const event of openAIStream) {
          const evt = event as unknown as {
            type?: string;
            delta?: unknown;
            error?: { message?: string };
          };

          if (evt?.type === 'response.output_text.delta') {
            if (typeof evt.delta === 'string') {
              markdown += evt.delta;
              controller.enqueue(
                encoder.encode(
                  `event: chunk\ndata: ${JSON.stringify({
                    chunk: evt.delta
                  })}\n\n`
                )
              );
            }
          } else if (evt?.type === 'response.error') {
            const message =
              evt.error?.message ?? 'OpenAI returned an unknown error';
            controller.enqueue(
              encoder.encode(
                `event: server-error\ndata: ${JSON.stringify({ message })}\n\n`
              )
            );
            controller.close();
            return;
          }
        }

        const meta = await finalizeMarkdownStream(topic, openAIStream);
        const rendered = renderMarkdownPage(slug, markdown);

        setCachedPage(slug, {
          markdown,
          html: rendered.html,
          title: rendered.title,
          description: rendered.description,
          lastUpdated: rendered.lastUpdated,
          tokens: meta.tokens,
          at: Date.now()
        });

        console.log(
          JSON.stringify({
            slug,
            cacheHit: false,
            genLatencyMs: Date.now() - start,
            tokens: meta.tokens ?? null,
            fallback: false,
            streamed: true,
            at: new Date().toISOString()
          })
        );

        controller.enqueue(
          encoder.encode(
            `event: complete\ndata: ${JSON.stringify({
              ok: true,
              title: rendered.title,
              description: rendered.description,
              tokens: meta.tokens ?? null,
              latency: Date.now() - start,
              html: rendered.html,
              markdown
            })}\n\n`
          )
        );
        controller.close();
      } catch (error) {
        const message =
          error instanceof GenerationError
            ? error.message
            : error instanceof Error
            ? error.message
            : 'Streaming failed unexpectedly';

        controller.enqueue(
          encoder.encode(
            `event: server-error\ndata: ${JSON.stringify({ message })}\n\n`
          )
        );
        controller.close();
      } finally {
        try {
          openAIStream.abort();
        } catch {
          // no-op
        }
      }
    },
    cancel() {
      try {
        openAIStream.abort();
      } catch {
        // ignore
      }
    }
  });

  return new Response(readable, {
    headers: sseHeaders
  });
}

const sseHeaders = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive'
} as const;

function sseErrorResponse(
  slug: string,
  startedAt: number,
  message: string,
  status = 500
) {
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('event: start\ndata: {}\n\n'));
      controller.enqueue(
        encoder.encode(
          `event: server-error\ndata: ${JSON.stringify({
            message
          })}\n\n`
        )
      );
      controller.close();
    }
  });

  console.error(
    JSON.stringify({
      slug,
      cacheHit: false,
      genLatencyMs: Date.now() - startedAt,
      tokens: null,
      fallback: true,
      message
    })
  );

  return new Response(readable, {
    headers: sseHeaders,
    status
  });
}
