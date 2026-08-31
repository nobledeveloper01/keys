
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'How often we are wrong — Keys',
  description:
    'Reports received, upheld and dismissed, and how long a decision takes. Published by Keys about itself.',
};

/**
 * The registry's own numbers.
 *
 * Keys publishes accusations about named people. A service that does that and
 * publishes nothing about how often it is wrong is asking for a trust it has
 * not earned — so the dismissal rate is on the site, dated, next to the queue
 * depth and the median time to a decision.
 *
 * **The uncomfortable number is the point.** A registry that upholds everything
 * is a rumour mill and one that upholds nothing is not working; printing the
 * split is what makes either visible from outside. No competitor in this market
 * publishes it, and matching it would mean publishing theirs.
 */
export default async function Transparency() {
  let figures: Awaited<ReturnType<typeof read>> | null = null;
  try {
    figures = await read();
  } catch {
    figures = null;
  }

  if (figures === null) {
    return (
      <main>
        <h1>How often we are wrong</h1>
        <p className="lede">
          These figures are read live from the registry, and we could not reach it just
          now. They are not cached, so there is nothing to show you instead.
        </p>
      </main>
    );
  }

  const decided = figures.upheld + figures.notUpheld;
  const dismissedShare = decided === 0 ? null : Math.round((figures.notUpheld / decided) * 100);

  return (
    <main>
      <h1>How often we are wrong</h1>
      <p className="lede">
        Keys publishes reports about named people. This is what happened to every report
        we received in the last ninety days, including the ones we decided against.
      </p>

      <div className="figures">
        <Figure value={figures.received} label="reports received" />
        <Figure value={figures.upheld} label="upheld and published" tone="alarm" />
        <Figure value={figures.notUpheld} label="not upheld" tone="clear" />
        <Figure value={figures.awaitingDecision} label="still waiting" />
      </div>

      {dismissedShare !== null && (
        <div className="verdict">
          <p>
            <strong>{dismissedShare}% of the reports we decided, we did not uphold.</strong>
          </p>
          <p className="small quiet">
            That is the number this page exists for. A registry that upheld everything
            would be a rumour mill; one that upheld nothing would not be working. Neither
            is visible from outside unless somebody prints the split.
          </p>
        </div>
      )}

      <h2>How long it takes</h2>
      <p>
        {figures.medianDaysToDecision === null
          ? 'Nothing has been decided yet in this window.'
          : `Half of all decisions were made within ${figures.medianDaysToDecision} days of the report arriving.`}
        {figures.oldestAwaitingDays !== null &&
          ` The report that has been waiting longest has been waiting ${figures.oldestAwaitingDays} days.`}
      </p>
      <p className="small quiet">
        A median, not an average — one report that sat for months while a reviewer chased
        a document would drag an average far enough to be a lie about the typical wait.
      </p>

      <h2>What is not here</h2>
      <p className="small quiet">
        No reporter, no reported number, no reviewer, and no report. The endpoint behind
        this page has no field that could carry one, which is checked by the same test
        that checks no unreviewed report is reachable by any route.
      </p>
    </main>
  );
}

function Figure({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone?: 'clear' | 'alarm';
}) {
  return (
    <div className="figure">
      <p className={`count ${tone ?? ''}`}>{value}</p>
      <p className="small quiet">{label}</p>
    </div>
  );
}

async function read() {
  const base = process.env.KEYS_API_URL;
  if (!base) throw new Error('KEYS_API_URL is not set.');
  const response = await fetch(new URL('/v1/registry/transparency', base), {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('the registry did not answer');
  return (await response.json()) as {
    since: string;
    received: number;
    upheld: number;
    notUpheld: number;
    awaitingDecision: number;
    medianDaysToDecision: number | null;
    oldestAwaitingDays: number | null;
  };
}
