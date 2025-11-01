import { NextResponse } from 'next/server';
import {
  assertValidSlug,
  InvalidSlugError
} from '../../../../lib/slug';
import { deleteCachedPage } from '../../../../lib/cache';

export async function DELETE(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = assertValidSlug(params.slug);
    deleteCachedPage(slug);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof InvalidSlugError) {
      return NextResponse.json({ ok: false, error: 'Invalid slug' }, { status: 400 });
    }
    console.error('Failed to delete cache entry', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete cache entry' },
      { status: 500 }
    );
  }
}
