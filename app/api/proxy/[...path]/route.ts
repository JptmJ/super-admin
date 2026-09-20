/**
 * Forwards a browser request to the backend with the operator's token attached.
 *
 * Only `/api/platform/*` is reachable: without that check this panel would be a
 * general-purpose way to call any backend endpoint as a super admin, which is
 * not what it is for.
 *
 * On a 401 it transparently refreshes once and retries — a 15-minute access
 * token would otherwise interrupt the admin mid-form.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { REFRESH_COOKIE, SESSION_COOKIE, backendUrl, cookieOptions } from '@/lib/session';

const ALLOWED_PREFIX = 'platform/';

async function forward(request: Request, path: string[], method: string) {
  const suffix = path.join('/');
  if (!suffix.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'This panel can only reach platform endpoints.' } },
      { status: 403 },
    );
  }

  const store = await cookies();
  const search = new URL(request.url).search;
  const body = method === 'GET' || method === 'DELETE' ? undefined : await request.text();

  const send = async (token: string | undefined) =>
    fetch(`${backendUrl()}/api/${suffix}${search}`, {
      method,
      headers: {
        accept: 'application/json',
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body,
      cache: 'no-store',
    });

  let response = await send(store.get(SESSION_COOKIE)?.value).catch(() => null);
  if (!response) {
    return NextResponse.json(
      { error: { code: 'unreachable', message: 'Cannot reach the backend.' } },
      { status: 502 },
    );
  }

  if (response.status === 401) {
    const refreshToken = store.get(REFRESH_COOKIE)?.value;
    if (refreshToken) {
      const refreshed = await fetch(`${backendUrl()}/api/platform/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      }).catch(() => null);

      if (refreshed?.ok) {
        const { accessToken } = await refreshed.json();
        store.set(SESSION_COOKIE, accessToken, cookieOptions(60 * 15));
        response = (await send(accessToken).catch(() => null)) ?? response;
      }
    }
  }

  if (response.status === 204) return new NextResponse(null, { status: 204 });
  const payload = await response.text();
  return new NextResponse(payload, {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, ctx: Ctx) {
  return forward(request, (await ctx.params).path, 'GET');
}
export async function POST(request: Request, ctx: Ctx) {
  return forward(request, (await ctx.params).path, 'POST');
}
export async function PATCH(request: Request, ctx: Ctx) {
  return forward(request, (await ctx.params).path, 'PATCH');
}
export async function PUT(request: Request, ctx: Ctx) {
  return forward(request, (await ctx.params).path, 'PUT');
}
export async function DELETE(request: Request, ctx: Ctx) {
  return forward(request, (await ctx.params).path, 'DELETE');
}
