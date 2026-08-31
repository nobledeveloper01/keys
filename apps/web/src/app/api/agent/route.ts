import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { ApiError } from '@keys/api';

import { api } from '../../../lookup';

/**
 * The agent's browser posts here, and this posts to the API.
 *
 * ## The session never reaches the browser
 *
 * Sign-up returns a token once. The obvious thing is to hand it to the page and
 * keep it in `localStorage`, and that is what the first draft of this did —
 * which puts a bearer token for somebody's livelihood in a place any script on
 * the origin can read, forever, with no expiry and no way to revoke it from
 * the server.
 *
 * Instead the token is set here as an httpOnly cookie. The page never sees it,
 * `document.cookie` cannot read it, and every call the agent makes goes through
 * this route, which reads the cookie and forwards it as a header. The cost is
 * that the agent surface only works on this origin — which is what a surface
 * is.
 *
 * `SameSite=Strict` rather than `Lax`, because every action here is a state
 * change and none of them should be reachable by following a link from
 * somewhere else.
 */
const COOKIE = 'keys_agent';

function session(token: string) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // Thirty days. Long enough that an agent is not signed out mid-week,
    // short enough that a shared laptop does not stay signed in for a year.
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ detail: 'Malformed request.' }, { status: 400 });
  }

  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;

  try {
    if (body.action === 'signUp') {
      if (typeof body.displayName !== 'string' || typeof body.phone !== 'string') {
        return NextResponse.json({ detail: 'Malformed request.' }, { status: 400 });
      }
      const created = await api().signUp(body.displayName, body.phone);
      const response = NextResponse.json({ agentId: created.agentId });
      // The token goes into the cookie and not into the body it is answering.
      response.cookies.set(session(created.token));
      return response;
    }

    if (body.action === 'signOut') {
      const response = NextResponse.json({ signedOut: true });
      response.cookies.set({ ...session(''), maxAge: 0 });
      return response;
    }

    if (!token) {
      return NextResponse.json({ detail: 'Sign in first.' }, { status: 401 });
    }
    const asAgent = api({ agentToken: token });

    if (body.action === 'askLandlord') {
      if (typeof body.propertyId !== 'string' || typeof body.landlordPhone !== 'string') {
        return NextResponse.json({ detail: 'Malformed request.' }, { status: 400 });
      }
      return NextResponse.json(
        await asAgent.agent.askLandlord(body.propertyId, body.landlordPhone),
      );
    }

    if (body.action === 'draft') {
      if (typeof body.propertyId !== 'string' || typeof body.title !== 'string') {
        return NextResponse.json({ detail: 'Malformed request.' }, { status: 400 });
      }
      return NextResponse.json(await asAgent.agent.draft(body.propertyId, body.title));
    }

    if (body.action === 'publish') {
      if (typeof body.id !== 'string') {
        return NextResponse.json({ detail: 'Malformed request.' }, { status: 400 });
      }
      return NextResponse.json(await asAgent.agent.publish(body.id));
    }

    return NextResponse.json({ detail: 'Malformed request.' }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { detail: 'We could not do that just now. Nothing was changed.' },
      { status: 502 },
    );
  }
}
