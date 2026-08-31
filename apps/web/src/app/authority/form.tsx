'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Six digits, and nothing else on the page to get wrong.
 *
 * A client component because it needs the sending and refused states. The
 * refusal wording is deliberately identical for a wrong code, an expired one
 * and one already spent — the server answers the same way for all three, and a
 * page that distinguished them would undo that on the way to the screen.
 */
export function CodeForm({ challengeId }: { challengeId: string }) {
  const [code, setCode] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle');
  const [problem, setProblem] = useState<string | null>(null);
  const [unpublished, setUnpublished] = useState(0);

  const alert = useRef<HTMLParagraphElement>(null);
  const confirmation = useRef<HTMLDivElement>(null);

  // After commit, not inside `requestAnimationFrame` — that runs before React
  // has written anything, so it measures the previous screen.
  useEffect(() => {
    if (problem !== null) {
      alert.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, [problem]);

  useEffect(() => {
    if (state === 'done') {
      confirmation.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, [state]);

  if (state === 'done') {
    return (
      <div className="verdict clear" ref={confirmation}>
        <p>
          <strong>Done. Thank you for confirming.</strong>
        </p>
        {unpublished > 0 ? (
          <p className="small">
            {unpublished === 1
              ? 'One listing is no longer public.'
              : `${unpublished} listings are no longer public.`}{' '}
            That took effect immediately.
          </p>
        ) : (
          <p className="small">
            You can withdraw this at any time. Keep this message — the link in it
            still works.
          </p>
        )}
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState('sending');
    setProblem(null);
    try {
      const response = await fetch('/api/authority', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', challengeId, code: code.trim() }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const shape = body as { detail?: string } | null;
        setProblem(shape?.detail ?? 'That code is wrong or no longer valid.');
        setState('failed');
        return;
      }
      const answered = body as { unpublishedListings?: string[] } | null;
      setUnpublished(answered?.unpublishedListings?.length ?? 0);
      setState('done');
    } catch {
      setProblem('We could not reach Keys just now. Nothing was changed.');
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

      <label htmlFor="code">The six digits from the text</label>
      <input
        id="code"
        name="code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        /*
          `inputMode` and `autoComplete`, so the phone opens a number pad and
          offers the code from the message it has just received. On the device
          this page is actually read on, that is the difference between one tap
          and six.
        */
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        required
      />
      <p className="small quiet">It stops working half an hour after it was sent.</p>

      <button type="submit" disabled={state === 'sending' || code.trim().length < 6}>
        {state === 'sending' ? 'Sending…' : 'Confirm'}
      </button>
    </form>
  );
}
