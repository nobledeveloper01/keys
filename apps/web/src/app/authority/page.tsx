import { CodeForm } from './form';

export const dynamic = 'force-dynamic';

export const metadata = {
  /*
    Its own title, and not indexed. Same reasoning as the reply page: the URL
    carries a challenge id, and a landlord confirming their agent has no
    business appearing in a search index.
  */
  title: 'Confirm your agent — Keys',
  robots: { index: false, follow: false },
};

/**
 * Where a landlord lands, from a link in an SMS.
 *
 * The whole verification ladder rests on this page working for somebody who
 * has never heard of Keys, has no account, and is reading a text message about
 * an agent they may or may not have hired. So: no sign-in, no navigation, and
 * the sentence that matters — *nothing happens unless you enter the code* —
 * above the form rather than under it.
 *
 * It is also the page that makes withdrawal real. An authority nobody can take
 * back is not an authority, it is a transfer, and the way this page treats the
 * two is deliberately symmetrical: the same six digits, the same one screen.
 */
export default async function Authority({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;

  if (!c) {
    return (
      <main>
        <h1>Confirming an agent</h1>
        <p>
          If an agent asked us to confirm that they may let a property of yours, we
          sent a code by SMS to your number. Open the link from that message — it is
          the only way we can tell it is you, and we would rather that than ask you
          to create an account.
        </p>
        <p className="small quiet">
          Keys never asks for money, bank details, or a password. If a message
          claiming to be from us asks for any of those, it is not from us.
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>Confirm your agent</h1>

      {/*
        Said before the form, not after it.

        Somebody who did not expect this text is at their most anxious in the
        first two seconds. The thing that calms them is knowing that doing
        nothing is safe, and that has to be readable before the input box.
      */}
      <p>
        <strong>Nothing changes unless you enter the code.</strong> If you were not
        expecting this message, ignore it — no agent gains anything by our sending
        it, and it will stop working within the half hour.
      </p>

      <p className="small quiet">
        The code was sent to the number you use with this property. We do not ask
        for it anywhere else, and nobody from Keys will ever ring you for it.
      </p>

      <CodeForm challengeId={c} />
    </main>
  );
}
