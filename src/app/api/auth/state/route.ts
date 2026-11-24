/**
 * OAuth state issuer - POST /api/auth/state
 *
 * Mengenkripsi `state` OAuth (berisi path tujuan setelah login) di server
 * memakai SESSION_ENCRYPTION_KEY. Sebelumnya kunci ini dikirim ke browser
 * lewat NEXT_PUBLIC_SESSION_ENCRYPTION_KEY sehingga state bisa dipalsukan
 * (core-service-flag-removal-plan.md P0).
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateState } from '@/lib/oauth';

const SESSION_ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY || '';
const DEFAULT_PATH = '/dashboard';

/** Hanya path relatif di origin yang sama (cegah open redirect). */
function safeRedirectPath(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_PATH;
  const path = raw.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    return DEFAULT_PATH;
  }
  return path.slice(0, 512);
}

export async function POST(request: NextRequest): Promise<Response> {
  if (!SESSION_ENCRYPTION_KEY) {
    console.error('SESSION_ENCRYPTION_KEY not configured');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  let body: { path?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // body kosong → pakai path default
  }

  const state = await generateState(safeRedirectPath(body.path), SESSION_ENCRYPTION_KEY);
  return NextResponse.json({ state }, { headers: { 'Cache-Control': 'no-store' } });
}
