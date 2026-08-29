import { NextResponse } from 'next/server';

import { ApiError } from '@keys/api';

import { api } from '../../../lookup';

/**
 * The browser posts here, and this posts to the API.
 *
 * Not a direct call from the page. Proxying means the browser never learns the
 * API's address, the CORS allow-list never has to name a public web origin, and
 * a person reading the network tab of the reply page cannot find the endpoint
 * that takes reply tokens.
 */
export async function POST(request: Request) {
  let body: { token?: unknown; reply?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ detail: 'Malformed request.' }, { status: 400 });
  }

  if (typeof body.token !== 'string' || typeof body.reply !== 'string') {
    return NextResponse.json({ detail: 'Malformed request.' }, { status: 400 });
  }

  try {
    const result = await api().answer({ token: body.token, reply: body.reply });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { detail: 'We could not send that just now. Try again in a moment.' },
      { status: 502 },
    );
  }
}
