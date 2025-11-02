import OpenAI from 'openai';

export const DEFAULT_DISCLAIMER =
  'This page was generated automatically and may contain inaccuracies.';

const markdownSystemPrompt = [
  'You are an editor crafting engaging, well-structured Markdown web articles.',
  'Tone: concise, neutral, timeless, and trustworthy.',
  'Always start with a single H1 that matches the requested topic title verbatim or its most common name.',
  'Follow the H1 with a lead paragraph (2–4 sentences) that reads like a short introduction.',
  'Organize the rest of the article into 3–6 H2 sections; mix section styles as appropriate:',
  '- Narrative sections with rich paragraphs.',
  '- Bulleted or numbered lists when outlining steps, features, or key points.',
  '- Markdown tables for data comparisons (only when you have at least two columns of structured facts).',
  '- Block quotes for notable quotations or summaries.',
  '- Timeline or chronology tables/lists for historical topics.',
  'Always include at least one list OR table somewhere beyond the intro.',
  'Use callouts like block quotes or bold subheadings sparingly to add visual variety.',
  'Only include quotations if they are well-known, fully attributed, and you are confident they are accurate; otherwise omit them.',
  'If the topic relates to technology, code, or data, include a short fenced code block or pseudo-code when helpful.',
  'If the topic is a place, event, or person, add a "Key Facts" list or table.',
  'Conclude with a short section titled "Further Context" or "Looking Ahead" if it fits the topic.',
  `End the entire document with a standalone paragraph containing exactly: "${DEFAULT_DISCLAIMER}".`,
  'Markdown only. No raw HTML, no image embeds.',
  'Prefer the most common interpretation when ambiguity exists.',
  'Do not invent statistics, dates, or quotes—stick to broadly accepted, verifiable information.'
].join(' ');

const markdownUserPrompt = (topic: string) =>
  `Generate a rich Markdown article about "${topic}". Tailor the structure to the subject (history, science, product, concept, etc.) while following the system guidelines.

Before you begin, ensure the topic fits a general-knowledge reference page. If it appears unrelated, promotional, or unsafe, respond with:"I can only generate neutral reference pages for broad topics."`;

export class GenerationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'GenerationError';
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

const globalForOpenAI = globalThis as typeof globalThis & {
  __openaiClient?: OpenAI;
};

const generationMeta = new Map<
  string,
  {
    tokens?: number;
  }
>();

export interface GenerationMeta {
  tokens?: number;
}

export function getGenerationMeta(topic: string) {
  return generationMeta.get(topic);
}

function recordMeta(topic: string, meta: GenerationMeta) {
  generationMeta.set(topic, meta);
}

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new GenerationError('OPENAI_API_KEY is not set');
  }

  if (!globalForOpenAI.__openaiClient) {
    globalForOpenAI.__openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  return globalForOpenAI.__openaiClient;
}

export type ResponseStream = Awaited<
  ReturnType<ReturnType<typeof getClient>['responses']['stream']>
>;

export async function createMarkdownStream(
  topic: string
): Promise<ResponseStream> {
  const client = getClient();

  try {
    return await client.responses.stream({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      input: [
        { role: 'system', content: markdownSystemPrompt },
        { role: 'user', content: markdownUserPrompt(topic) }
      ]
    });
  } catch (error) {
    throw new GenerationError('Failed to start OpenAI stream', { cause: error });
  }
}

export async function finalizeMarkdownStream(
  topic: string,
  stream: ResponseStream
): Promise<GenerationMeta> {
  try {
    const final = await stream.finalResponse();
    const tokens = final.usage?.total_tokens ?? undefined;
    recordMeta(topic, { tokens });
    return { tokens };
  } catch (error) {
    throw new GenerationError('Failed to finalize OpenAI stream', {
      cause: error
    });
  }
}
