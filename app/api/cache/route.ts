import { NextResponse } from 'next/server';
import { getCacheStats } from '../../../lib/cache';

export async function GET() {
  const stats = getCacheStats();
  return NextResponse.json(
    {
      ...stats,
      updatedAt: new Date().toISOString()
    },
    {
      status: 200
    }
  );
}
