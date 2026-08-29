'use client';

import { useState } from 'react';

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

  if (state === 'sent') {
    return (
      <div className="verdict clear">
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
        setProblem(shape?.detail ?? shape?.message ?? 'That did not send. Try again.');
        setState('failed');
        return;
      }
      setState('sent');
    } catch {
      setProblem('That did not send. Check your connection and try again.');
      setState('failed');
    }
  }

  return (
    // `void`, not a floating promise: `submit` catches everything itself and
      // resolves to nothing a handler could act on.
    <form onSubmit={(event) => void submit(event)} style={{ display: 'block' }}>
      <label htmlFor="reply">
        <strong>Your answer</strong>
      </label>
      <textarea
        id="reply"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        required
        minLength={10}
        placeholder="What actually happened?"
        style={{
          width: '100%',
          fontSize: 16,
          padding: '0.85rem 0.9rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--line)',
          background: 'var(--surface)',
          color: 'var(--ink)',
          margin: '0.5rem 0 1rem',
        }}
      />
      {problem && (
        <p className="small" style={{ color: 'var(--alarm)' }} role="alert">
          {problem}
        </p>
      )}
      <button type="submit" disabled={state === 'sending' || text.trim().length < 10}>
        {state === 'sending' ? 'Sending…' : 'Send my answer'}
      </button>
    </form>
  );
}
