import { NextResponse } from 'next/server';

import { ApiError } from '@keys/api';
import { isReportCategory } from '@keys/domain';

import { api } from '../../../lookup';
import { normalise } from '../../../lookup';

/** Same reasoning as the reply proxy: the browser never learns the API's address. */
export async function POST(request: Request) {
  let body: { phone?: unknown; category?: unknown; description?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ detail: 'Malformed request.' }, { status: 400 });
  }

  const phone = typeof body.phone === 'string' ? normalise(body.phone) : null;
  if (!phone) {
    return NextResponse.json(
      { detail: 'That does not look like a Nigerian phone number.' },
      { status: 400 },
    );
  }
  if (!isReportCategory(body.category)) {
    return NextResponse.json({ detail: 'Choose what happened.' }, { status: 400 });
  }
  if (typeof body.description !== 'string' || body.description.trim().length < 20) {
    return NextResponse.json(
      { detail: 'Describe what happened, in at least twenty characters.' },
      { status: 400 },
    );
  }

  try {
    const result = await api().report({
      reportedPhone: phone,
      category: body.category,
      description: body.description.trim(),
    });
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
