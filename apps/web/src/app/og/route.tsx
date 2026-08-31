import { ImageResponse } from 'next/og';


import { api } from '../../lookup';
import { normalise } from '../../phone';

export const runtime = 'nodejs';

/**
 * The preview card a Keys link produces when it is pasted into WhatsApp.
 *
 * This is the wedge doing its own distribution. The moment somebody actually
 * uses this product is a group chat where a person asks *does anyone know this
 * agent*, and the answer that helps is the one that arrives without anybody
 * having to tap a link and wait for a page on a Nigerian connection.
 *
 * So the verdict is drawn into the preview image itself: the count, what it
 * means, and the caveat. A reader who never opens the link still gets the
 * answer, and the people around them get it too.
 *
 * **It says the same things the page says.** The count comes from the same
 * `/v1/registry/lookup` the page and the app call, so a preview cannot claim
 * something the product would not. And a clean result carries its caveat here
 * too — a shareable card reading "0" with no qualification would be the
 * false-all-clear problem, redistributed.
 */
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get('phone') ?? '';
  const phone = normalise(asked);

  let upheld: number | null = null;
  if (phone !== null) {
    try {
      const reports = await api().lookup(phone);
      upheld = reports.upheldReports;
    } catch {
      // A preview that cannot reach the registry says so, rather than
      // rendering a zero it did not get told.
      upheld = null;
    }
  }

  const clean = upheld === 0;
  const ink = upheld === null ? '#F2F3F8' : clean ? '#45E1A2' : '#E66881';
  const headline =
    upheld === null
      ? 'Check a number before you pay'
      : clean
        ? 'No upheld reports'
        : upheld === 1
          ? 'One upheld report'
          : `${upheld} upheld reports`;
  const detail =
    upheld === null
      ? 'Reports of rental scams in Nigeria, each one reviewed by a person.'
      : clean
        ? 'That is not a clean bill of health. Most scams are never reported.'
        : 'Each was reviewed by a person, and the number had seven days to answer.';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 72,
          background: 'linear-gradient(140deg, #573EE7 0%, #2E16B3 55%, #150A5C 100%)',
          fontFamily: 'sans-serif',
          color: '#F2F3F8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, opacity: 0.85 }}>
          <svg width="46" height="46" viewBox="0 0 48 48">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              fill="#fff"
              d="M24 2.6 7.2 8.5v13.4c0 10.9 6.9 20.6 16.8 24.1 9.9-3.5 16.8-13.2 16.8-24.1V8.5L24 2.6Zm0 4.9 12.1 4.25v10.35c0 8.3-4.95 15.75-12.1 19-7.15-3.25-12.1-10.7-12.1-19V11.75L24 7.5Z"
            />
            <path
              fill="#fff"
              d="M24 11.9a6.6 6.6 0 0 0-2.35 12.77v8.98a1.6 1.6 0 0 0 1.6 1.6h1.5a1.6 1.6 0 0 0 1.6-1.6v-1.6h1.85a1.5 1.5 0 0 0 0-3h-1.85v-1.9h1.85a1.5 1.5 0 0 0 0-3h-1.85v-.48A6.6 6.6 0 0 0 24 11.9Z"
            />
          </svg>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.6 }}>Keys</div>
        </div>

        {upheld !== null && (
          <div style={{ fontSize: 150, fontWeight: 800, color: ink, lineHeight: 1, marginTop: 30 }}>
            {String(upheld)}
          </div>
        )}

        <div style={{ fontSize: 58, fontWeight: 700, letterSpacing: -1.4, marginTop: 14 }}>
          {headline}
        </div>
        <div style={{ fontSize: 30, opacity: 0.82, marginTop: 14, maxWidth: 900 }}>{detail}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
