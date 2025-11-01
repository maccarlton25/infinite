export const SLUG_REGEX = /^[a-z0-9-]{1,100}$/;

export class InvalidSlugError extends Error {
  constructor(public readonly input: string) {
    super(`Invalid slug: "${input}"`);
    this.name = 'InvalidSlugError';
  }
}

export function normalizeSlug(input: string): string {
  let value = (input ?? '').toString().trim().toLowerCase();
  value = value.replace(/[\s_]+/g, '-');
  value = value.replace(/[^a-z0-9-]/g, '-');
  value = value.replace(/-+/g, '-');
  value = value.replace(/^-+|-+$/g, '');
  return value;
}

export function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}

export function assertValidSlug(input: string): string {
  const normalized = normalizeSlug(input);
  if (!isValidSlug(normalized)) {
    throw new InvalidSlugError(input);
  }
  return normalized;
}

export function topicFromSlug(slug: string): string {
  return slug.replace(/-/g, ' ');
}
