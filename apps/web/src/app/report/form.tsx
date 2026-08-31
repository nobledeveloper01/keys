'use client';

import { useEffect, useRef, useState } from 'react';

import { REPORT_CATEGORIES } from '@keys/domain';

import { normalise } from '../../phone';

import { categoryWords } from '../../categories';

export function ReportForm() {
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [problem, setProblem] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<string | null>(null);

  /*
    Where to send the reader when the form is refused.

    The message rendered at the bottom of the form and nothing moved, so on a
    phone — where the submit button and the error are both well below the fold
    a reader has scrolled away from — pressing send appeared to do nothing at
    all. `role="alert"` announces it to a screen reader; sighted readers were
    the ones left guessing.
  */
  const phoneField = useRef<HTMLInputElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  const confirmation = useRef<HTMLDivElement>(null);
  const [aim, setAim] = useState<'phone' | 'alert' | null>(null);

  function show(message: string, at: 'phone' | 'alert' = 'alert') {
    setProblem(message);
    setState('failed');
    setAim(at);
  }

  /*
    Moved in an effect rather than straight after `setProblem`.

    The first attempt did the scroll inside `requestAnimationFrame`, which runs
    before React has committed the state that renders the message — so it
    scrolled to a node that was not on the page yet and focused nothing.
    Measured: `scrollY` stayed at 0 and `document.activeElement` was `body`.
    An effect keyed on the message runs after commit, which is the only point
    at which there is something to scroll to.
  */
  useEffect(() => {
    if (problem === null || aim === null) return;
    const target = aim === 'phone' ? phoneField.current : alert.current;

    /*
      Focus first, then scroll, and scroll instantly.

      The other order left the page exactly where it was: measured with the
      field ten points above the viewport, focus landed on it and `scrollY`
      never moved, because calling `focus` cancels a smooth scroll that is
      still in flight. An instant scroll cannot be interrupted, and it is the
      right behaviour anyway — somebody who just pressed send and was refused
      wants to see why, not to watch the page travel there.
    */
    if (aim === 'phone') phoneField.current?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'center', behavior: 'auto' });
    setAim(null);
  }, [problem, aim]);

  /*
    Bring the confirmation into view.

    The form is replaced in place, several screens below a preamble the reader
    has already read. Without this, pressing send on a phone shortens the page
    under your thumb and leaves you looking at the same paragraph you were
    looking at before — with no way to tell whether anything happened.
  */
  useEffect(() => {
    if (state === 'sent') {
      confirmation.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, [state]);

  if (state === 'sent') {
    return (
      <div className="verdict clear" ref={confirmation}>
        <p>
          <strong>Thank you. A person will review this.</strong>
        </p>
        <p className="small">
          {deadline
            ? `Whoever holds that number has until ${new Date(deadline).toLocaleDateString(
                'en-NG',
                { day: 'numeric', month: 'long' },
              )} to answer. Nothing is published before then, and nothing is published unless it is upheld.`
            : 'Nothing is published until it is upheld.'}
        </p>
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    /*
      The number is checked here as well as on the server.

      Not because the server's check is untrusted — it is the one that counts —
      but because it is the only refusal the reader can fix without a round
      trip, and catching it here is what lets the cursor land in the field that
      is wrong rather than on a sentence at the bottom of the page.
    */
    if (normalise(phone) === null) {
      show('That does not look like a Nigerian phone number.', 'phone');
      return;
    }

    setState('sending');
    setProblem(null);
    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone, category, description }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const shape = body as { detail?: string } | null;
        show(shape?.detail ?? 'That did not send. Try again.');
        return;
      }
      setDeadline((body as { replyDeadlineAt?: string } | null)?.replyDeadlineAt ?? null);
      setState('sent');
    } catch {
      show('That did not send. Check your connection and try again.');
    }
  }


  return (
    // `void`, not a floating promise: `submit` catches everything itself and
      // resolves to nothing a handler could act on.
    <form onSubmit={(event) => void submit(event)}>
      <div className="field">
      <label htmlFor="phone">The number you are reporting</label>
      <input
        id="phone"
        ref={phoneField}
        type="tel"
        inputMode="tel"
        required
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="0803 123 4567"
       
      />

      </div>

      <div className="field">
      <label htmlFor="category">What happened</label>
      <select
        id="category"
        required
        value={category}
        onChange={(e) => setCategory(e.target.value)}
       
      >
        <option value="">Choose one…</option>
        {REPORT_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {categoryWords(c)}
          </option>
        ))}
      </select>

      </div>

      <div className="field">
      <label htmlFor="description">In your own words</label>
      <textarea
        id="description"
        required
        minLength={20}
        rows={6}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="When, where, how much, and what they said."
       
        aria-describedby="description-help"
      />
      <p id="description-help" className="help">
        A reviewer can only uphold what they can assess. Dates and amounts help.
      </p>
      </div>

      {problem && (
        <p className="error" role="alert" ref={alert}>
          {problem}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'sending' || !phone || !category || description.trim().length < 20}
      >
        {state === 'sending' ? 'Sending…' : 'Send this report'}
      </button>
    </form>
  );
}
