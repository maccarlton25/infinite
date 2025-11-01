import { NextResponse } from 'next/server';
import { resetCache, getCacheStats } from '../../../lib/cache';

export async function POST() {
  resetCache();
  const stats = getCacheStats();
  return NextResponse.json(
    {
      ok: true,
      cache: stats
    },
    {
      status: 200
    }
  );
}
