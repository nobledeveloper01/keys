import { NextResponse } from 'next/server';

/**
 * The console's browser talks to the API through here.
 *
 * Same reasoning as the other proxies — the browser never learns the API's
 * address — plus one specific to this surface: the reviewer's token goes in a
 * header on a same-origin request, so it never appears in a URL, a referrer, or
 * a server log line that records query strings.
 */
const API = process.env.KEYS_API_URL;

export async function POST(request: Request) {
  if (!API) {
    return NextResponse.json({ detail: 'KEYS_API_URL is not set.' }, { status: 500 });
  }

  let body: { token?: unknown; path?: unknown; method?: unknown; payload?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ detail: 'Malformed request.' }, { status: 400 });
  }

  const { token, path, method, payload } = body;
  if (typeof token !== 'string' || typeof path !== 'string') {
    return NextResponse.json({ detail: 'Malformed request.' }, { status: 400 });
  }

  /*
    An allow-list of paths, not a pass-through.

    A proxy that forwards whatever path it is handed is an open relay into the
    API from any origin the browser will talk to, which would make every other
    guard on this server irrelevant. Only these shapes are reachable.
  */
  const allowed =
    path === '/v1/review/queue' ||
    path === '/v1/review/metrics' ||
    /^\/v1\/review\/[0-9a-f-]{36}$/i.test(path) ||
    /^\/v1\/review\/[0-9a-f-]{36}\/(decision|evidence)$/i.test(path);

  if (!allowed) {
    return NextResponse.json({ detail: 'Not a review path.' }, { status: 400 });
  }

  const verb = method === 'POST' ? 'POST' : 'GET';
  const response = await fetch(new URL(path, API), {
    method: verb,
    headers: {
      'x-reviewer-token': token,
      ...(verb === 'POST' ? { 'content-type': 'application/json' } : {}),
    },
    ...(verb === 'POST' ? { body: JSON.stringify(payload ?? {}) } : {}),
  }).catch(() => null);

  if (!response) {
    return NextResponse.json(
      { detail: 'We could not reach the API. Nothing was changed.' },
      { status: 502 },
    );
  }

  const text = await response.text();
  return new NextResponse(text || '{}', {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  });
}
