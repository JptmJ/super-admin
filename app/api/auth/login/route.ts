/**
 * Signs in against the backend and parks the tokens in httpOnly cookies.
 * The token never reaches client JavaScript.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { REFRESH_COOKIE, SESSION_COOKIE, backendUrl, cookieOptions } from '@/lib/session';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: { code: 'validation_error', message: 'Email and password are required.' } }, { status: 400 });
  }

  let response: Response;
  try {
    console.log('backendUrl', backendUrl());
    response = await fetch(`${backendUrl()}/api/platform/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'unreachable', message: 'Cannot reach the backend. Is it running?' } },
      { status: 502 },
    );
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return NextResponse.json(payload ?? { error: { code: 'unauthorized', message: 'Sign-in failed.' } }, { status: response.status });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, payload.accessToken, cookieOptions(60 * 15));
  store.set(REFRESH_COOKIE, payload.refreshToken, cookieOptions(60 * 60 * 24 * 30));

  return NextResponse.json({ user: payload.user, permissions: payload.permissions });
}
