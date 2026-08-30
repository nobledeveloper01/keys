'use client';

import { useCallback, useEffect, useState } from 'react';

interface QueueItem {
  id: string;
  status: string;
  category: string;
  submittedAt: string;
  replyDeadlineAt: string;
  publishedAt: string | null;
  description: string;
  evidenceCount: number;
  hasReply: boolean;
  reply: string | null;
}

interface HistoryEntry {
  reviewer: string;
  action: string;
  reasoning: string;
  at: string;
}

interface Metrics {
  waiting: number;
  oldestWaitingSince: string | null;
  decisions: Array<{ reviewer: string; action: string; count: number }>;
}

const CATEGORY_WORDS: Record<string, string> = {
  fake_listing: 'The property did not exist',
  inspection_fee_scam: 'Inspection fee for a viewing that never happened',
  property_already_let: 'The property had already been let',
  impersonation: 'Pretended to be an agent or landlord they were not',
  undisclosed_fees: 'Fees that were never mentioned',
  no_show: 'Took the appointment and never turned up',
};

async function call<T>(
  token: string,
  path: string,
  method: 'GET' | 'POST' = 'GET',
  payload?: unknown,
): Promise<T> {
  const response = await fetch('/api/review', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, path, method, payload }),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const shape = body as { detail?: string; message?: string } | null;
    throw new Error(shape?.detail ?? shape?.message ?? 'That did not work.');
  }
  return body as T;
}

export function Console() {
  const [token, setToken] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [open, setOpen] = useState<(QueueItem & { history?: HistoryEntry[] }) | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  /*
    `sessionStorage`, not `localStorage`.

    A reviewer's token reads every unreviewed accusation in the registry. It
    should not outlive the tab on a machine that may be shared, and it should
    not be sitting in a browser profile a week later.
  */
  useEffect(() => {
    try {
      const held = sessionStorage.getItem('keys.reviewer');
      if (held) {
        setToken(held);
        setSignedIn(true);
      }
    } catch {
      // A browser with storage blocked still works; the token just is not kept.
    }
  }, []);

  const refresh = useCallback(async (t: string) => {
    setProblem(null);
    try {
      const [q, m] = await Promise.all([
        call<{ reports: QueueItem[] }>(t, '/v1/review/queue'),
        call<Metrics>(t, '/v1/review/metrics'),
      ]);
      setQueue(q.reports);
      setMetrics(m);
      setSignedIn(true);
      try {
        sessionStorage.setItem('keys.reviewer', t);
      } catch {
        /* not kept; still usable */
      }
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'That did not work.');
      setSignedIn(false);
    }
  }, []);

  useEffect(() => {
    if (signedIn && token) void refresh(token);
  }, [signedIn, token, refresh]);

  if (!signedIn) {
    return (
      <main>
        <h1>Review console</h1>
        <p className="quiet">
          Every action here is recorded against your name. Nothing you decide is
          anonymous, including declining to uphold something.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void refresh(token);
          }}
        >
          <input
            type="password"
            name="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Reviewer token"
            aria-label="Reviewer token"
            style={{
              flex: '1 1 16rem',
              fontSize: 16,
              minHeight: 48,
              padding: '0.85rem 0.9rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
            }}
          />
          <button type="submit">Open the queue</button>
        </form>
        {problem && (
          <p className="small" style={{ color: 'var(--alarm)' }} role="alert">
            {problem}
          </p>
        )}
      </main>
    );
  }

  if (open) {
    return (
      <One
        report={open}
        token={token}
        onDone={() => {
          setOpen(null);
          void refresh(token);
        }}
      />
    );
  }

  return (
    <main>
      <h1>Review queue</h1>

      {metrics && (
        <div className="verdict">
          <p className="count">{metrics.waiting}</p>
          <p>
            <strong>waiting for a decision</strong>
          </p>
          {metrics.oldestWaitingSince && (
            <p className="small quiet">
              Oldest submitted {new Date(metrics.oldestWaitingSince).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'long',
              })}
              . This number is the constraint on how fast Keys can open a city.
            </p>
          )}
          {metrics.decisions.length > 0 && (
            <ul className="categories small">
              {metrics.decisions.map((d) => (
                <li key={`${d.reviewer}-${d.action}`}>
                  {d.reviewer}: {d.count} {d.action.replace(/_/g, ' ')}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {queue.length === 0 && <p className="quiet">Nothing is waiting. That is the target, not the norm.</p>}

      {queue.map((report) => (
        <button
          key={report.id}
          onClick={() => {
            void call<QueueItem & { history: HistoryEntry[] }>(token, `/v1/review/${report.id}`)
              .then(setOpen)
              .catch((e: unknown) =>
                setProblem(e instanceof Error ? e.message : 'That did not work.'),
              );
          }}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            background: 'var(--surface)',
            color: 'var(--ink)',
            border: '1px solid var(--line)',
            marginBottom: '0.75rem',
            padding: '1rem',
          }}
        >
          <strong>{CATEGORY_WORDS[report.category] ?? report.category}</strong>
          <br />
          <span className="small quiet">
            {report.evidenceCount === 0 ? 'No evidence attached · ' : `${report.evidenceCount} attached · `}
            {report.hasReply ? 'answered' : 'no answer yet'} · reply window closes{' '}
            {new Date(report.replyDeadlineAt).toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'long',
            })}
          </span>
        </button>
      ))}

      {problem && (
        <p className="small" style={{ color: 'var(--alarm)' }} role="alert">
          {problem}
        </p>
      )}
    </main>
  );
}

function One({
  report,
  token,
  onDone,
}: {
  report: QueueItem & { history?: HistoryEntry[] };
  token: string;
  onDone: () => void;
}) {
  const [reasoning, setReasoning] = useState('');
  const [note, setNote] = useState('');
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const windowOpen = new Date(report.replyDeadlineAt).getTime() > Date.now();

  async function act(path: string, payload: unknown) {
    setBusy(true);
    setProblem(null);
    try {
      await call(token, path, 'POST', payload);
      onDone();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'That did not work.');
      setBusy(false);
    }
  }

  const field = {
    width: '100%',
    fontSize: 16,
    padding: '0.85rem 0.9rem',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--line)',
    background: 'var(--surface)',
    color: 'var(--ink)',
    margin: '0.4rem 0 1rem',
  } as const;

  return (
    <main>
      <button onClick={onDone} style={{ background: 'none', color: 'var(--accent)', padding: 0 }}>
        ← Back to the queue
      </button>

      <h1>{CATEGORY_WORDS[report.category] ?? report.category}</h1>
      <p className="quiet small">
        Submitted{' '}
        {new Date(report.submittedAt).toLocaleDateString('en-NG', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
        . The reporter is not named here, or anywhere.
      </p>

      <div className="verdict">
        <p>{report.description}</p>
      </div>

      <p>
        <strong>Their answer</strong>
      </p>
      {report.hasReply ? (
        <div className="verdict clear">
          <p>{report.reply}</p>
        </div>
      ) : (
        <div className={`verdict ${windowOpen ? '' : 'alarm'}`}>
          <p className="small">
            {windowOpen
              ? `No answer yet. The window closes ${new Date(report.replyDeadlineAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long' })}, and this cannot be upheld before then.`
              : 'The window closed without an answer. This is recorded on the public entry if you uphold it.'}
          </p>
        </div>
      )}

      <p>
        <strong>Evidence</strong> — {report.evidenceCount} attached
      </p>
      {report.evidenceCount === 0 && (
        <p className="small quiet">
          Nothing can be upheld without evidence. Record what you were sent, and how.
        </p>
      )}
      <label htmlFor="note" className="small">
        What the evidence is
      </label>
      <textarea
        id="note"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={field}
      />
      <label htmlFor="source" className="small">
        How it reached you
      </label>
      <input id="source" value={source} onChange={(e) => setSource(e.target.value)} style={field} />
      <button
        disabled={busy || note.trim().length < 20 || source.trim().length < 3}
        onClick={() => void act(`/v1/review/${report.id}/evidence`, { note, source })}
      >
        Record this evidence
      </button>

      <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '2rem 0' }} />

      <p>
        <strong>Your decision</strong>
      </p>
      <label htmlFor="reasoning" className="small">
        Why. Somebody may have to answer for this a year from now, and it will be
        this sentence they read.
      </label>
      <textarea
        id="reasoning"
        rows={4}
        value={reasoning}
        onChange={(e) => setReasoning(e.target.value)}
        style={field}
      />

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {(['upheld', 'not_upheld', 'insufficient_evidence'] as const).map((decision) => (
          <button
            key={decision}
            disabled={busy || reasoning.trim().length < 20}
            style={decision === 'upheld' ? { background: 'var(--alarm)' } : undefined}
            onClick={() =>
              void act(`/v1/review/${report.id}/decision`, { decision, reasoning })
            }
          >
            {decision === 'upheld'
              ? 'Uphold — publish this'
              : decision === 'not_upheld'
                ? 'Not upheld'
                : 'Not enough to say'}
          </button>
        ))}
      </div>

      {problem && (
        <p className="small" style={{ color: 'var(--alarm)' }} role="alert">
          {problem}
        </p>
      )}

      {report.history && report.history.length > 0 && (
        <>
          <p style={{ marginTop: '2rem' }}>
            <strong>What has already been done to this report</strong>
          </p>
          <ul className="small">
            {report.history.map((h, i) => (
              <li key={i}>
                <strong>{h.reviewer}</strong> — {h.action.replace(/_/g, ' ')} —{' '}
                {new Date(h.at).toLocaleString('en-NG')}
                <br />
                <span className="quiet">{h.reasoning}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
