import type { Metadata } from 'next';
import Link from 'next/link';

import { normalise } from '../lookup';
import { Verdict } from './verdict';

export const dynamic = 'force-dynamic';

/**
 * The preview card carries the answer.
 *
 * A result already has a URL — this makes that URL worth pasting. In the group
 * chat where somebody asks *does anyone know this agent*, the reply that helps
 * is the one that shows the verdict without anybody tapping through and waiting
 * for a page on a Nigerian connection.
 *
 * Per-result, not per-site: the image route reads the same phone number and
 * answers from the same endpoint the page does, so a preview cannot say
 * something the product would not.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}): Promise<Metadata> {
  const { phone } = await searchParams;
  const asked = (phone ?? '').trim();
  const image = asked ? `/og?phone=${encodeURIComponent(asked)}` : '/og';

  return {
    title: 'Keys — check a number before you pay',
    description:
      'Check a Nigerian phone number against reports of rental scams. No account, no app.',
    openGraph: {
      images: [{ url: image, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', images: [image] },
  };
}

/**
 * The whole wedge, on one page.
 *
 * Someone was sent a listing on WhatsApp. They have the agent's number and no
 * reason yet to install anything. This page has to be useful to them in one
 * screen, with no account, and it has to be honest about what a clean result
 * does and does not mean.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const { phone: raw } = await searchParams;
  const asked = (raw ?? '').trim();
  const phone = asked ? normalise(asked) : null;

  return (
    <main>
      <h1>Check a number before you pay</h1>
      <p className="lede">
        Reports of rental scams in Nigeria, each one reviewed by a person before it
        appears here. No account. Nothing to install.
      </p>

      {/* A GET form, so the result has a URL somebody can send to a friend. */}
      <form action="/" method="get" className="row">
        <label htmlFor="phone" className="sr-only">
          Phone number
        </label>
        <input
          id="phone"
          type="tel"
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0803 123 4567"
          defaultValue={asked}
          aria-describedby="phone-help"
        />
        <button type="submit">Check</button>
      </form>
      <p id="phone-help" className="help">
        Any format. 0803…, +234 803…, or 803….
      </p>

      {asked && !phone && (
        <div className="verdict">
          <p>
            <strong>That does not look like a Nigerian phone number.</strong>
          </p>
          <p className="quiet small">
            Eleven digits starting 0, or the same number written with +234.
          </p>
        </div>
      )}

      {phone && <Verdict phone={phone} />}

      <hr />

      <p className="small quiet">
        Been reported yourself? <Link href="/reply">Answer it here</Link>. You have
        seven days before anything can be published, and nothing is published unless a
        person upholds it.
      </p>
    </main>
  );
}
