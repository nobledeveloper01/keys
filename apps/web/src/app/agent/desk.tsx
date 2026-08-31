'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import type { AgentProfile, Listing } from '@keys/api';

async function call(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const parsed: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const shape = parsed as { detail?: string } | null;
    throw new Error(shape?.detail ?? 'That did not work.');
  }
  return (parsed ?? {}) as Record<string, unknown>;
}

/**
 * Opening an account, and being told plainly that it proves nothing.
 *
 * No password. The session is a token the server sets as an httpOnly cookie,
 * which means there is no credential for somebody to reuse from another
 * breach, and nothing on this page ever holds it.
 */
export function SignUp() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'failed'>('idle');
  const [problem, setProblem] = useState<string | null>(null);
  const alert = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (problem !== null) alert.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
  }, [problem]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState('sending');
    setProblem(null);
    try {
      await call({ action: 'signUp', displayName: displayName.trim(), phone: phone.trim() });
      router.refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'That did not work.');
      setState('failed');
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      {problem !== null && (
        <p className="error" role="alert" ref={alert}>
          {problem}
        </p>
      )}

      <label htmlFor="displayName">Your name, as tenants will see it</label>
      <input
        id="displayName"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        autoComplete="name"
        required
      />

      <label htmlFor="phone">Your business number</label>
      <input
        id="phone"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        inputMode="tel"
        autoComplete="tel"
        required
      />
      <p className="small quiet">
        This is the number tenants will check. Once your ID is verified, looking it
        up will show your name and what has been confirmed about you.
      </p>

      <button type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Opening…' : 'Open an account'}
      </button>
    </form>
  );
}

/**
 * What an agent has, and what it is worth.
 *
 * The order is the argument: standing first, because it is the thing a tenant
 * sees and therefore the thing worth improving; then the way to improve it;
 * then the listings, which cannot be published until it has been.
 */
export function AgentDesk({
  profile,
  listings,
}: {
  profile: AgentProfile;
  listings: Listing[];
}) {
  const router = useRouter();
  const [problem, setProblem] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState('');
  const [landlordPhone, setLandlordPhone] = useState('');
  const [title, setTitle] = useState('');
  const [draftProperty, setDraftProperty] = useState('');

  const alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (problem !== null) alert.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
  }, [problem]);

  async function run(what: string, body: Record<string, unknown>, said: string) {
    setBusy(what);
    setProblem(null);
    setNote(null);
    try {
      await call(body);
      setNote(said);
      router.refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'That did not work.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main>
      <h1>Your agent account</h1>

      {problem !== null && (
        <p className="error" role="alert" ref={alert}>
          {problem}
        </p>
      )}
      {note !== null && <p className="notice">{note}</p>}

      {/*
        The tenant's view of you, shown to you in the same words they read.

        Not a score and not a badge. An agent who sees "nothing about you has
        been checked" knows exactly what to do next; one who sees a grey badge
        and a percentage does not.
      */}
      <div className="verdict">
        <p className="small quiet">What a tenant sees when they check your number</p>
        <p>
          <strong>{profile.displayName}</strong>
        </p>
        <p>{profile.meaning}</p>
        {profile.confirmedProperties > 0 && (
          <p className="small quiet">
            {profile.confirmedProperties === 1
              ? 'One property a landlord confirmed'
              : `${profile.confirmedProperties} properties a landlord confirmed`}
          </p>
        )}
        {profile.upheldReports > 0 && (
          <p className="small">
            {profile.upheldReports === 1
              ? 'One upheld report against your number.'
              : `${profile.upheldReports} upheld reports against your number.`}{' '}
            Tenants see this alongside everything above.
          </p>
        )}
      </div>

      {/*
        What to do next, and honestly when there is nothing to do.

        The page offered "ask a landlord" to an agent at `unverified`, which is
        a step that cannot help them: a landlord confirmation sits above an ID
        check on the ladder, so it changes nothing until the check exists — and
        Keys has not chosen a vendor yet, so it does not. Sending somebody to
        spend a landlord's goodwill on a step with no effect is worse than
        telling them to wait.
      */}
      {profile.tier === 'unverified' && (
        <div className="verdict">
          <p>
            <strong>Your ID has not been checked yet, and you cannot do that part here.</strong>
          </p>
          <p className="small">
            An ID check is the first rung, and everything else rests on it — a
            landlord confirming you changes nothing until it is done. We are not
            running ID checks yet. When we are, this page will ask you for one.
          </p>
          <p className="small quiet">
            You can still draft listings below. You will not be able to publish
            them until both steps are done.
          </p>
        </div>
      )}

      <h2>Ask a landlord to confirm you</h2>
      <p className="small quiet">
        We text them a code. They enter it, and nothing changes unless they do. Use
        their own number — not a second number of yours, which we check for and
        refuse.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            'ask',
            {
              action: 'askLandlord',
              propertyId: propertyId.trim(),
              landlordPhone: landlordPhone.trim(),
            },
            'We have queued a text to that landlord. Nothing changes until they enter the code.',
          ).then(() => {
            setPropertyId('');
            setLandlordPhone('');
          });
        }}
      >
        <label htmlFor="propertyId">Which property</label>
        <input
          id="propertyId"
          value={propertyId}
          onChange={(event) => setPropertyId(event.target.value)}
          placeholder="e.g. 14 Herbert Macaulay, flat 3"
          required
        />

        <label htmlFor="landlordPhone">The landlord&rsquo;s number</label>
        <input
          id="landlordPhone"
          value={landlordPhone}
          onChange={(event) => setLandlordPhone(event.target.value)}
          inputMode="tel"
          required
        />

        <button type="submit" disabled={busy === 'ask'}>
          {busy === 'ask' ? 'Sending…' : 'Ask them'}
        </button>
      </form>

      <h2>Your listings</h2>
      {listings.length === 0 ? (
        <p className="small quiet">
          Nothing yet. You can draft a listing before a landlord has confirmed you —
          you just cannot publish it until they have.
        </p>
      ) : (
        <ul className="listings">
          {listings.map((listing) => (
            <li key={listing.id}>
              <p>
                <strong>{listing.title}</strong>
              </p>
              <p className="small quiet">{listing.propertyId}</p>
              {listing.publishedAt ? (
                <p className="small">Public since {new Date(listing.publishedAt).toDateString()}</p>
              ) : (
                <>
                  <p className="small quiet">Draft — nobody can see this.</p>
                  <button
                    type="button"
                    disabled={busy === listing.id}
                    onClick={() =>
                      void run(
                        listing.id,
                        { action: 'publish', id: listing.id },
                        'Published. Tenants can see it now.',
                      )
                    }
                  >
                    {busy === listing.id ? 'Publishing…' : 'Publish'}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3>Draft another</h3>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            'draft',
            { action: 'draft', propertyId: draftProperty.trim(), title: title.trim() },
            'Drafted. It is private until you publish it.',
          ).then(() => {
            setTitle('');
            setDraftProperty('');
          });
        }}
      >
        <label htmlFor="title">What you are letting</label>
        <input
          id="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="2 bedroom flat, Yaba"
          required
        />

        <label htmlFor="draftProperty">Which property</label>
        <input
          id="draftProperty"
          value={draftProperty}
          onChange={(event) => setDraftProperty(event.target.value)}
          placeholder="The same wording you used above"
          required
        />

        <button type="submit" disabled={busy === 'draft'}>
          {busy === 'draft' ? 'Saving…' : 'Save draft'}
        </button>
      </form>

      <p className="small quiet">
        <button
          type="button"
          className="linkish"
          onClick={() => void run('out', { action: 'signOut' }, 'Signed out.')}
        >
          Sign out on this device
        </button>
      </p>
    </main>
  );
}
