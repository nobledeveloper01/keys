'use client';

import { useState } from 'react';

import { REPORT_CATEGORIES } from '@keys/domain';

import { categoryWords } from '../../categories';

export function ReportForm() {
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [problem, setProblem] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<string | null>(null);

  if (state === 'sent') {
    return (
      <div className="verdict clear">
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
        setProblem(shape?.detail ?? 'That did not send. Try again.');
        setState('failed');
        return;
      }
      setDeadline((body as { replyDeadlineAt?: string } | null)?.replyDeadlineAt ?? null);
      setState('sent');
    } catch {
      setProblem('That did not send. Check your connection and try again.');
      setState('failed');
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
        <p className="error" role="alert">
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
