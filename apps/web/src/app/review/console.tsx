'use client';

import { useCallback, useEffect, useState } from 'react';

import type {
  AgentUnderReview,
  DuplicatePair,
  ListingView,
  ReviewItem,
  ReviewMetrics,
} from '@keys/api';

import { categoryWords } from '../../categories';

/*
  The server's own shapes, generated from its controllers.

  These were three hand-written interfaces copied from the API's responses.
  They were correct, and they were a second place the wire format lived — the
  console would have gone on rendering `evidenceCount` after the server renamed
  it, with `tsc` green the whole way. The console cannot call the generated
  client (it goes through a same-origin proxy so the reviewer's token stays on
  this origin), but there is no reason for it to retype what the client already
  knows.
*/
type QueueItem = ReviewItem;
type Metrics = ReviewMetrics;

interface HistoryEntry {
  reviewer: string;
  action: string;
  reasoning: string;
  at: string;
}

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
  const [agents, setAgents] = useState<AgentUnderReview[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [open, setOpen] = useState<(QueueItem & { history?: HistoryEntry[] }) | null>(null);
  /** The listing a report was filed about, when it was filed about one. */
  const [listing, setListing] = useState<ListingView | null>(null);
  /** The listing a report was filed about, when it was filed about one. */

  /*
    Back to the top whenever the view changes.

    Opening a report from halfway down the queue kept the queue's scroll
    position, so the reviewer landed in the middle of the report with the
    "Back to the queue" button already hidden behind the sticky masthead. The
    browser does this for a navigation; this is one component swapping what it
    renders, so nothing was going to do it for us.

    `auto`, not `smooth`: a reviewer working a queue changes this view all day
    and does not need it animated each time.
  */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [open?.id, signedIn]);
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
      const [q, m, a, d] = await Promise.all([
        call<{ reports: QueueItem[] }>(t, '/v1/review/queue'),
        call<Metrics>(t, '/v1/review/metrics'),
        call<AgentUnderReview[]>(t, '/v1/agent-review'),
        call<DuplicatePair[]>(t, '/v1/duplicates'),
      ]);
      setQueue(q.reports);
      setMetrics(m);
      setAgents(a);
      setDuplicates(d);
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
          className="row"
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
          />
          <button type="submit">Open the queue</button>
        </form>
        {problem && (
          <p className="error" role="alert">
            {problem}
          </p>
        )}
      </main>
    );
  }

  if (open) {
    return (
      <One
        listing={listing}
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
              .then((full) => {
                setOpen(full);
                setListing(null);
                /*
                  Fetched when the report is opened, not with the queue.

                  Most reports have no listing, and pulling one for every row
                  would be a request per queue item to answer a question nobody
                  asked yet.
                */
                if (full.listingId) {
                  void call<ListingView>(token, `/v1/listings/${full.listingId}`)
                    .then(setListing)
                    // A listing that has since been unpublished is a 404, and
                    // that is information rather than an error: the report
                    // stands, and the reviewer sees no panel.
                    .catch(() => setListing(null));
                }
              })
              .catch((e: unknown) =>
                setProblem(e instanceof Error ? e.message : 'That did not work.'),
              );
          }}
          className="queue-item"
        >
          {/*
            No `<br />`. `.queue-item strong` is already a block with its own
            margin, so the break added a second empty line between the title
            and its meta — a gap that looked like a missing element.
          */}
          <strong>{categoryWords(report.category)}</strong>
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

      <Duplicates
        pairs={duplicates}
        token={token}
        onChanged={() => void refresh(token)}
        onProblem={setProblem}
      />

      <Agents
        agents={agents}
        token={token}
        onChanged={() => void refresh(token)}
        onProblem={setProblem}
      />

      {problem && (
        <p className="error" role="alert">
          {problem}
        </p>
      )}
    </main>
  );
}

/**
 * Images that appear on two listings.
 *
 * Above the agents and below the reports, which is the order of how fast each
 * one goes stale: a report has a reply window closing on somebody's public
 * accusation, a duplicate is a listing collecting inspection fees today, and
 * the agent list is a list.
 *
 * Both buttons demand a reason, and the labels say what each one does rather
 * than *blocked* and *allowed* — a reviewer choosing between two adjectives is
 * a reviewer guessing at consequences.
 */
function Duplicates({
  pairs,
  token,
  onChanged,
  onProblem,
}: {
  pairs: DuplicatePair[];
  token: string;
  onChanged: () => void;
  onProblem: (message: string) => void;
}) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  if (pairs.length === 0) {
    return (
      <>
        <h2>Duplicate images</h2>
        <p className="quiet">Nothing waiting. A match here is a listing using somebody else&rsquo;s photographs.</p>
      </>
    );
  }

  function decide(pair: DuplicatePair, decision: 'blocked' | 'allowed') {
    const key = `${pair.listingId}/${pair.matchedListingId}`;
    setBusy(key);
    void call(token, `/v1/duplicates/${key}`, 'POST', {
      decision,
      reasoning: reasons[key] ?? '',
    })
      .then(() => {
        setReasons((was) => ({ ...was, [key]: '' }));
        onChanged();
      })
      .catch((e: unknown) => onProblem(e instanceof Error ? e.message : 'That did not work.'))
      .finally(() => setBusy(null));
  }

  return (
    <>
      <h2>Duplicate images</h2>
      <p className="small quiet">
        The same photograph on two listings is the cheapest scam in this market. It is
        also what an agency changing hands looks like, so nothing is blocked until you
        say so.
      </p>

      <ul className="listings">
        {pairs.map((pair) => {
          const key = `${pair.listingId}/${pair.matchedListingId}`;
          return (
            <li key={key}>
              <p>
                <strong>{pair.meaning}</strong>
              </p>
              <p className="small quiet">
                {pair.listingId} used a picture already on {pair.matchedListingId}
                {' · '}
                {pair.distance === 0 ? 'identical' : `${pair.distance} of 64 bits differ`}
                {' · '}
                seen {new Date(pair.firstSeenAt).toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'long',
                })}
              </p>

              <label htmlFor={`why-${key}`}>Why you decided that</label>
              <textarea
                id={`why-${key}`}
                value={reasons[key] ?? ''}
                onChange={(event) =>
                  setReasons((was) => ({ ...was, [key]: event.target.value }))
                }
              />

              <button type="button" disabled={busy === key} onClick={() => decide(pair, 'blocked')}>
                {busy === key ? 'Saving…' : `Take ${pair.listingId} down`}
              </button>{' '}
              <button
                type="button"
                className="linkish"
                disabled={busy === key}
                onClick={() => decide(pair, 'allowed')}
              >
                Both may use it
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * The agents, and the one decision a reviewer can take about them.
 *
 * Below the report queue on purpose. The queue is work with a deadline — a
 * reply window closing on somebody's public accusation — and this is a list to
 * be looked at. Putting it above would put the thing with no clock in front of
 * the thing with one.
 *
 * The only action here is withdrawing an identity check, and it is guarded by a
 * confirm step because it takes every listing that agent has off the market in
 * one transaction. That is somebody's income stopping, on one click, and the
 * click should have to be meant.
 */
function Agents({
  agents,
  token,
  onChanged,
  onProblem,
}: {
  agents: AgentUnderReview[];
  token: string;
  onChanged: () => void;
  onProblem: (message: string) => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (agents.length === 0) {
    return (
      <>
        <h2>Agents</h2>
        <p className="quiet">Nobody has opened an agent account yet.</p>
      </>
    );
  }

  return (
    <>
      <h2>Agents</h2>
      <p className="small quiet">
        A tier is computed from the attestations below every time it is read. There
        is nothing here to set.
      </p>

      <ul className="listings">
        {agents.map((agent) => (
          <li key={agent.agentId}>
            <p>
              <strong>{agent.displayName}</strong>
            </p>
            <p className="small">{agent.meaning}</p>
            <p className="small quiet">
              Joined {new Date(agent.joinedAt).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {' · '}
              {agent.publishedListings === 1
                ? '1 listing public'
                : `${agent.publishedListings} listings public`}
              {agent.upheldReports > 0 &&
                ` · ${agent.upheldReports} upheld report${agent.upheldReports === 1 ? '' : 's'}`}
            </p>

            {agent.evidence.length > 0 && (
              <ul className="categories small">
                {agent.evidence.map((e, index) => (
                  <li key={`${e.kind}-${e.propertyId ?? ''}-${index}`}>
                    {e.kind === 'identity'
                      ? `ID checked by ${e.attestor}`
                      : `Landlord confirmed ${e.propertyId ?? 'a property'}`}
                    {' · '}
                    {new Date(e.at).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {/*
                      Withdrawn evidence is shown, struck through rather than
                      hidden. A reviewer looking at an agent who is back down to
                      unverified needs to see that a check happened and was
                      taken away — a list that quietly omitted it would make a
                      revoked forgery look like an account that never tried.
                    */}
                    {!e.live && <span className="withdrawn"> withdrawn</span>}
                  </li>
                ))}
              </ul>
            )}

            {agent.evidence.some((e) => e.kind === 'identity' && e.live) &&
              (confirming === agent.agentId ? (
                <>
                  <p className="small">
                    This takes every listing {agent.displayName} has published off the
                    market immediately, and drops them to unverified. It cannot be
                    undone from here — they would have to be checked again.
                  </p>
                  <button
                    type="button"
                    disabled={busy === agent.agentId}
                    onClick={() => {
                      setBusy(agent.agentId);
                      void call(
                        token,
                        `/v1/agent-review/${agent.agentId}/withdraw-identity`,
                        'POST',
                      )
                        .then(() => {
                          setConfirming(null);
                          onChanged();
                        })
                        .catch((e: unknown) =>
                          onProblem(e instanceof Error ? e.message : 'That did not work.'),
                        )
                        .finally(() => setBusy(null));
                    }}
                  >
                    {busy === agent.agentId ? 'Withdrawing…' : 'Yes, withdraw it'}
                  </button>{' '}
                  <button type="button" className="linkish" onClick={() => setConfirming(null)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="linkish"
                  onClick={() => setConfirming(agent.agentId)}
                >
                  Withdraw the ID check
                </button>
              ))}
          </li>
        ))}
      </ul>
    </>
  );
}

function One({
  report,
  listing,
  token,
  onDone,
}: {
  report: QueueItem & { history?: HistoryEntry[] };
  /**
   * The listing this report is about, when it is about one.
   *
   * Fetched by the caller when the report is opened rather than here, because
   * most reports have no listing and this component should not decide when to
   * make a request.
   */
  listing: ListingView | null;
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


  return (
    <main>
      <button onClick={onDone} className="button-quiet">
        ← Back to the queue
      </button>

      <h1>{categoryWords(report.category)}</h1>
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

      {/*
        The listing this was filed about, shown rather than linked.

        `fake_listing` has been a category since phase 1, and until this a
        reviewer was being asked whether a property is fiction with no way to
        look at it. The server has sent `listingId` since a report could be
        filed from a listing page; nothing rendered it, so the field existed and
        the reviewer still could not see the flat.

        Not a link. The console never talks to the API from the browser — every
        call goes through `/api/review` so the reviewer token stays on the
        server — and a link to a web listing page would be a link to a route
        that does not exist. What is shown is what the *reporter* saw: the same
        nine conditions, from the same public endpoint.
      */}
      {listing && (
        <>
          <h2>The listing this is about</h2>
          <div className="verdict">
            <p>
              <strong>{listing.title}</strong>
              <br />
              {listing.address}
            </p>
            <ul className="checks">
              {listing.checks.map((check) => (
                <li key={check.condition}>
                  {check.met ? '✓' : '✗'} {check.label}
                </li>
              ))}
            </ul>
            <p className="quiet small">
              Listed by {listing.agentName}. This is the page the reporter was reading, and it
              is recomputed now — a listing that has since lost its badge shows that here.
            </p>
          </div>
        </>
      )}

      <h2>Their answer</h2>
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

      <h2>Evidence</h2>
      <p className="quiet small">{report.evidenceCount} attached</p>
      {report.evidenceCount === 0 && (
        <p className="small quiet">
          Nothing can be upheld without evidence. Record what you were sent, and how.
        </p>
      )}
      <div className="field">
      <label htmlFor="note">What the evidence is</label>
      <textarea
        id="note"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
       
      />
      </div>
      <div className="field">
      <label htmlFor="source">How it reached you</label>
      <input id="source" value={source} onChange={(e) => setSource(e.target.value)} />
      </div>
      <button
        className="button-quiet"
        disabled={busy || note.trim().length < 20 || source.trim().length < 3}
        onClick={() => void act(`/v1/review/${report.id}/evidence`, { note, source })}
      >
        Record this evidence
      </button>

      <hr />

      <h2>Your decision</h2>
      <div className="field">
      <label htmlFor="reasoning">Why you decided that</label>
      <p className="help">
        Somebody may have to answer for this a year from now, and it will be this
        sentence they read.
      </p>
      <textarea
        id="reasoning"
        rows={4}
        value={reasoning}
        onChange={(e) => setReasoning(e.target.value)}
       
      />

      </div>

      <div className="decisions">
        {(['upheld', 'not_upheld', 'insufficient_evidence'] as const).map((decision) => (
          <button
            key={decision}
            disabled={busy || reasoning.trim().length < 20}
            className={decision === 'upheld' ? 'button-danger' : 'button-quiet'}
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
        <p className="error" role="alert">
          {problem}
        </p>
      )}

      {report.history && report.history.length > 0 && (
        <>
          <h2>What has already been done to this report</h2>
          <ul className="history">
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
