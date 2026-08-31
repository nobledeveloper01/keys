'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The one interactive thing on the page.
 *
 * A client component because it needs the submitting and failed states, and
 * because posting the answer must not lose what somebody typed. Everything
 * around it stays server-rendered.
 */
export function ReplyForm({ token }: { token: string }) {
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [problem, setProblem] = useState<string | null>(null);

  // Same reasoning as the report form: a refusal that renders below the fold
  // and moves nothing looks exactly like a button that did not work.
  const alert = useRef<HTMLParagraphElement>(null);
  const confirmation = useRef<HTMLDivElement>(null);

  function show(message: string) {
    setProblem(message);
    setState('failed');
  }

  // After commit, not inside `requestAnimationFrame` — see the report form for
  // what that measured.
  useEffect(() => {
    if (problem !== null) {
      alert.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, [problem]);

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
          <strong>Your answer is on the record.</strong>
        </p>
        <p className="small">
          A reviewer reads it alongside the report before deciding anything.
        </p>
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState('sending');
    setProblem(null);
    try {
      const response = await fetch('/api/reply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, reply: text }),
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const shape = body as { detail?: string; message?: string } | null;
        show(shape?.detail ?? shape?.message ?? 'That did not send. Try again.');
        return;
      }
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
      <label htmlFor="reply">Your answer</label>
      <textarea
        id="reply"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        required
        minLength={10}
        placeholder="What actually happened?"
      />
      </div>
      {problem && (
        <p className="error" role="alert" ref={alert}>
          {problem}
        </p>
      )}
      <button type="submit" disabled={state === 'sending' || text.trim().length < 10}>
        {state === 'sending' ? 'Sending…' : 'Send my answer'}
      </button>
    </form>
  );
}
