import { NextResponse } from 'next/server';

import { ApiError } from '@keys/api';

import { api } from '../../../lookup';

/**
 * The browser posts here, and this posts to the API.
 *
 * Same reasoning as the other proxies — the browser never learns the API's
 * address, and the CORS allow-list never has to name a public web origin.
 *
 * Two actions on one route, chosen by a field rather than by a path, because
 * the alternative is two files differing in four lines. The `action` is
 * matched against a closed set; anything else is a malformed request rather
 * than something forwarded to see what happens.
 */
export async function POST(request: Request) {
  let body: {
    action?: unknown;
    challengeId?: unknown;
    code?: unknown;
    agentId?: unknown;
    propertyId?: unknown;
    landlordPhone?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ detail: 'Malformed request.' }, { status: 400 });
  }

  try {
    if (body.action === 'confirm') {
      if (typeof body.challengeId !== 'string' || typeof body.code !== 'string') {
        return NextResponse.json({ detail: 'Malformed request.' }, { status: 400 });
      }
      return NextResponse.json(
        await api().confirmAuthority(body.challengeId, body.code),
      );
    }

    if (body.action === 'withdraw') {
      if (
        typeof body.agentId !== 'string' ||
        typeof body.propertyId !== 'string' ||
        typeof body.landlordPhone !== 'string'
      ) {
        return NextResponse.json({ detail: 'Malformed request.' }, { status: 400 });
      }
      /*
        The number is forwarded to be checked, not used (ADR-0017).

        The API hashes it and compares it with the number that granted the
        authority; only a match opens a challenge, and the text goes to that
        same number. A stranger's number gets the same answer as a pair that
        does not exist, so nothing here puts the hole back on the other side
        of the wall.
      */
      return NextResponse.json(
        await api().askToWithdrawAuthority(body.agentId, body.propertyId, body.landlordPhone),
      );
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
