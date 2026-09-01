import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  PUBLICATION_MONTHS,
  REPLY_WINDOW_DAYS,
  isPublic,
  isPurgeable,
  replyDeadline,
  review,
  standing,
  transparency,
  type Report,
  type ReportStatus,
} from '../src/reports.ts';

const T0 = new Date('2026-03-04T06:00:00Z');
const days = (n: number) => new Date(T0.getTime() + n * 86_400_000);
const months = (afterDays: number, n: number) => {
  const d = new Date(days(afterDays));
  d.setMonth(d.getMonth() + n);
  return d;
};

const report = (over: Partial<Report> = {}): Report => ({
  id: 'r1',
  status: 'submitted',
  category: 'inspection_fee_scam',
  // A registry report: a number and no property, which is the case this
  // product started with and still the common one.
  listingId: null,
  submittedAt: T0,
  replyDeadlineAt: replyDeadline(T0),
  publishedAt: null,
  expiresAt: null,
  hasReply: false,
  ...over,
});

/**
 * The whole of Keys' defamation position lives in this file.
 *
 * Phase 1's exit gate is "no unreviewed report is publicly retrievable by any
 * query path". These are the domain half. The server half is the adversarial
 * suite that tries to reach one through every route the API exposes.
 */
describe('nothing is public until a person upheld it', () => {
  const hidden: ReportStatus[] = [
    'submitted',
    'under_review',
    'awaiting_reply',
    'not_upheld',
    'insufficient_evidence',
    'resolved',
    'expired',
  ];

  test('every status except upheld is invisible', () => {
    for (const status of hidden) {
      assert.equal(isPublic(report({ status }), days(30)), false, status);
    }
  });

  test('and upheld is still invisible without a publication date', () => {
    // Belt and braces. `publishedAt` is what the database query filters on, so
    // a status that says upheld while the column is null must not be shown by
    // an in-memory check that disagrees with the query.
    assert.equal(isPublic(report({ status: 'upheld', publishedAt: null }), days(30)), false);
  });

  test('a new status defaults to hidden, not to visible', () => {
    // The rule is written as an allow-list. If somebody adds `appealed` to
    // ReportStatus next year and forgets this file, the report stays private.
    // Written as a deny-list it would go public the day the status was added.
    const invented = report({ status: 'appealed' as ReportStatus, publishedAt: T0 });
    assert.equal(isPublic(invented, days(30)), false);
  });
});

describe('the reply window', () => {
  test('is seven days from submission', () => {
    assert.equal(
      replyDeadline(T0).getTime() - T0.getTime(),
      REPLY_WINDOW_DAYS * 86_400_000,
    );
  });

  test('refuses an upheld decision while it is still open', () => {
    // The case against Keys is publishing an accusation the accused was never
    // asked about. A reviewer working a backlog is exactly who would skip it,
    // so it is a refusal here rather than a line in a manual.
    const result = review(report(), 'upheld', true, days(3));

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, 'reply_window_open');
    assert.match(result.detail, /4 days left/);
  });

  test('unless they have already replied', () => {
    const result = review(report({ hasReply: true }), 'upheld', true, days(3));
    assert.equal(result.ok, true);
  });

  test('and closing it allows the decision', () => {
    const result = review(report(), 'upheld', true, days(8));
    assert.equal(result.ok, true);
  });

  test('but a dismissal needs no window at all', () => {
    // Only publication is dangerous. Clearing somebody early is not, and
    // making them wait a week to be cleared would be gratuitous.
    const result = review(report(), 'not_upheld', false, days(1));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.publishedAt, null);
  });
});

describe('review', () => {
  test('cannot uphold without evidence', () => {
    const result = review(report(), 'upheld', false, days(8));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, 'no_evidence');
  });

  test('publishes for twenty-four months and no longer', () => {
    const result = review(report(), 'upheld', true, days(8));
    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.notEqual(result.publishedAt, null);
    assert.notEqual(result.expiresAt, null);

    const expected = new Date(result.publishedAt!.getTime());
    expected.setMonth(expected.getMonth() + PUBLICATION_MONTHS);
    assert.equal(result.expiresAt!.getTime(), expected.getTime());
  });

  test('a dismissal is never given a publication date', () => {
    for (const decision of ['not_upheld', 'insufficient_evidence'] as const) {
      const result = review(report(), decision, true, days(8));
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.publishedAt, null, decision);
      // But it does get a deletion date. A dismissal is kept for pattern
      // detection and deleted on schedule; the thing it never gets is a date
      // on which strangers may read it.
      assert.notEqual(result.expiresAt, null, decision);
    }
  });

  test('cannot be taken twice', () => {
    const decided = report({ status: 'upheld', publishedAt: days(8) });
    const result = review(decided, 'not_upheld', true, days(9));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, 'already_decided');
  });
});

describe('expiry', () => {
  test('a published report stops being public when it expires', () => {
    // An accusation is not a life sentence. Twenty-four months, then it is
    // gone from the lookup whatever its status column still says.
    const published = report({
      status: 'upheld',
      publishedAt: days(8),
      expiresAt: days(8 + 730),
    });

    assert.equal(isPublic(published, days(700)), true);
    assert.equal(isPublic(published, days(8 + 730)), false);
    assert.equal(isPublic(published, days(900)), false);
  });

  test('and a publication date in the future is not yet public', () => {
    const future = report({ status: 'upheld', publishedAt: days(10) });
    assert.equal(isPublic(future, days(9)), false);
  });
});

describe('what a lookup answers', () => {
  test('counts only what a person upheld', () => {
    const mixed = [
      report({ id: 'a', status: 'submitted' }),
      report({ id: 'b', status: 'under_review' }),
      report({ id: 'c', status: 'not_upheld' }),
      report({ id: 'd', status: 'upheld', publishedAt: days(8), expiresAt: days(738), category: 'fake_listing', hasReply: true }),
      report({ id: 'e', status: 'upheld', publishedAt: days(20), expiresAt: days(750), category: 'no_show', hasReply: true }),
    ];

    const answer = standing(mixed, days(30));

    assert.equal(answer.upheld, 2);
    assert.deepEqual([...answer.categories], ['fake_listing', 'no_show']);
    assert.equal(answer.mostRecent?.getTime(), days(20).getTime());
    assert.equal(answer.everyReportHadRightOfReply, true);
  });

  test('says when a published report went unanswered', () => {
    // Reported beside the count rather than hidden behind it. Somebody
    // deciding whether to trust this is entitled to know whether the other
    // side was heard.
    const unanswered = [
      report({ status: 'upheld', publishedAt: days(8), expiresAt: days(738), hasReply: false }),
    ];

    assert.equal(standing(unanswered, days(30)).everyReportHadRightOfReply, false);
  });

  test('a number with nothing against it answers zero, not nothing', () => {
    const answer = standing([], days(30));
    assert.equal(answer.upheld, 0);
    assert.deepEqual([...answer.categories], []);
    assert.equal(answer.mostRecent, null);
  });
});

test('retention', async (t) => {
  await t.test('a dismissed report is given a deletion date, not a publication date', () => {
    const r = review(report({ replyDeadlineAt: days(-1) }), 'not_upheld', true, days(20));
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.publishedAt, null);
    assert.notEqual(r.expiresAt, null);
    assert.equal(r.expiresAt!.toISOString(), months(20, 12).toISOString());
  });

  await t.test('and is purgeable only once that date has passed', () => {
    const r = review(report({ replyDeadlineAt: days(-1) }), 'not_upheld', true, days(20));
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const row = { ...report({ replyDeadlineAt: days(-1) }), status: r.status, publishedAt: null, expiresAt: r.expiresAt };
    assert.equal(isPurgeable(row, new Date(months(20, 12).getTime() - 1)), false);
    assert.equal(isPurgeable(row, months(20, 12)), true);
  });

  await t.test('a report with no deletion date is never purgeable', () => {
    assert.equal(isPurgeable(report({ replyDeadlineAt: days(-1) }), new Date('2099-01-01T00:00:00Z')), false);
  });

  await t.test('an expired published report is purgeable, so publication is not forever', () => {
    const row = {
      ...report({ replyDeadlineAt: days(-1) }),
      status: 'upheld' as const,
      publishedAt: days(20),
      expiresAt: months(20, 24),
    };
    assert.equal(isPurgeable(row, new Date(months(20, 24).getTime() + 1)), true);
  });
});

test('what the registry says about itself', async (t) => {
  const decided = (over: Partial<Report>): Report =>
    report({ status: 'upheld', publishedAt: days(9), ...over });

  await t.test('counts what arrived, what was upheld and what was not', () => {
    const t0 = transparency(
      [
        decided({}),
        decided({ status: 'not_upheld', publishedAt: null, expiresAt: days(4) }),
        decided({ status: 'insufficient_evidence', publishedAt: null, expiresAt: days(6) }),
        report({}),
      ],
      days(30),
      days(-1),
    );
    assert.equal(t0.received, 4);
    assert.equal(t0.upheld, 1);
    assert.equal(t0.notUpheld, 2);
    assert.equal(t0.awaitingDecision, 1);
  });

  await t.test('reports a median rather than a mean, so one stalled case cannot hide the typical wait', () => {
    const quick = [1, 2, 3].map((d) => decided({ publishedAt: days(d) }));
    const stalled = decided({ publishedAt: days(200) });
    const withStall = transparency([...quick, stalled], days(300), days(-1));

    // Mean would be about 51 days. The median is the third of four.
    assert.ok(withStall.medianDaysToDecision !== null);
    assert.ok(withStall.medianDaysToDecision < 10, String(withStall.medianDaysToDecision));
  });

  await t.test('says null rather than zero when nothing has been decided', () => {
    const none = transparency([report({})], days(3), days(-1));
    assert.equal(none.medianDaysToDecision, null);
  });

  await t.test('carries no field that could name a person or a report', () => {
    /*
      The shape is the guarantee. A reviewer, a reporter or a report id cannot
      be leaked by a later change to the endpoint, because there is nowhere in
      the type to put one.
    */
    const shape = transparency([decided({})], days(30), days(-1));
    const allowed = [
      'since', 'received', 'upheld', 'notUpheld',
      'awaitingDecision', 'medianDaysToDecision', 'oldestAwaitingDays',
    ];
    assert.deepEqual(Object.keys(shape).sort(), [...allowed].sort());
  });

  await t.test('ignores anything submitted before the window', () => {
    const old = report({ submittedAt: days(-90) });
    assert.equal(transparency([old], days(0), days(-30)).received, 0);
  });
});
