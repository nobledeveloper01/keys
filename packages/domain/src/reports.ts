/**
 * The scam registry, and the rule that keeps it out of court.
 *
 * A published report is an accusation against a named person, made by a
 * stranger, on a platform they may not use. That is defamation exposure, and
 * Keys' own risk register calls it critical. Everything in this module exists
 * to make one sentence true:
 *
 *   **An unreviewed accusation is structurally incapable of being published.**
 *
 * Not policy-forbidden. Structurally incapable — `publishedAt` is null unless
 * a human upheld the report, the public query filters on `publishedAt`, and
 * there is no code path that sets it any other way.
 */

/** What a report alleges. Closed on purpose: free-text categories cannot be counted, and a registry that cannot count is a rumour. */
export type ReportCategory =
  | 'fake_listing'
  | 'inspection_fee_scam'
  | 'property_already_let'
  | 'impersonation'
  | 'undisclosed_fees'
  | 'no_show';

export type ReportStatus =
  | 'submitted'
  | 'under_review'
  | 'awaiting_reply'
  | 'upheld'
  | 'not_upheld'
  | 'insufficient_evidence'
  | 'resolved'
  | 'expired';

/** How long the reported party has to answer before a decision may be taken. */
export const REPLY_WINDOW_DAYS = 7;

/** How long an upheld report stays public. An accusation is not a life sentence. */
export const PUBLICATION_MONTHS = 24;

/**
 * How long a report that was *not* upheld is kept.
 *
 * Kept, never published. One dismissed report says nothing; the same number
 * reported eleven times by eleven strangers is a pattern a reviewer should
 * see. Retention for pattern detection is not retention for display, and
 * nothing in this module lets the second follow from the first.
 */
export const NOT_UPHELD_RETENTION_MONTHS = 12;

export interface Report {
  readonly id: string;
  readonly status: ReportStatus;
  readonly category: ReportCategory;
  readonly submittedAt: Date;
  readonly replyDeadlineAt: Date;
  /** Null unless upheld. The public query filters on exactly this. */
  readonly publishedAt: Date | null;
  readonly expiresAt: Date | null;
  readonly hasReply: boolean;
}

/**
 * The only statuses a member of the public may ever see.
 *
 * A single value, used by the lookup, by the tests and by the review console,
 * so "which reports are public" has one answer rather than one per caller.
 */
export const PUBLISHABLE: readonly ReportStatus[] = ['upheld'];

/**
 * Whether this report may be shown to someone who is not its reviewer.
 *
 * Deliberately narrow, and deliberately not a negation. Written as "is it
 * upheld and published and unexpired" rather than "is it not one of the
 * hidden ones", because a new status added later defaults to *hidden* under
 * the first form and to *visible* under the second. The next person to extend
 * `ReportStatus` should not have to notice this to stay safe.
 */
export function isPublic(report: Report, now: Date): boolean {
  if (!PUBLISHABLE.includes(report.status)) return false;
  if (report.publishedAt === null) return false;
  if (report.publishedAt.getTime() > now.getTime()) return false;
  if (report.expiresAt !== null && report.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

export type Decision = 'upheld' | 'not_upheld' | 'insufficient_evidence';

export type ReviewResult =
  | { readonly ok: true; readonly status: ReportStatus; readonly publishedAt: Date | null; readonly expiresAt: Date | null }
  | { readonly ok: false; readonly reason: ReviewRefusal; readonly detail: string };

export type ReviewRefusal = 'already_decided' | 'reply_window_open' | 'no_evidence';

/**
 * A reviewer's decision, and the only thing that can make a report public.
 *
 * Refuses before the reply window closes unless the reported party has already
 * answered. The window is the whole of Keys' defence: publishing an accusation
 * the accused was never given a chance to answer is the case against us, and a
 * reviewer working through a backlog on a Friday is exactly who would skip it.
 * So it is a refusal here rather than a note in a manual.
 */
export function review(
  report: Report,
  decision: Decision,
  hasEvidence: boolean,
  now: Date,
): ReviewResult {
  if (report.publishedAt !== null || report.status === 'upheld' || report.status === 'not_upheld') {
    return {
      ok: false,
      reason: 'already_decided',
      detail: 'This report has already been decided. Record a resolution instead.',
    };
  }

  if (!hasEvidence && decision === 'upheld') {
    return {
      ok: false,
      reason: 'no_evidence',
      detail: 'A report cannot be upheld without evidence attached to it.',
    };
  }

  const windowOpen = now.getTime() < report.replyDeadlineAt.getTime();
  if (windowOpen && !report.hasReply && decision === 'upheld') {
    const days = Math.ceil(
      (report.replyDeadlineAt.getTime() - now.getTime()) / 86_400_000,
    );
    return {
      ok: false,
      reason: 'reply_window_open',
      detail:
        `The reported party has ${days} day${days === 1 ? '' : 's'} left to answer. ` +
        'A report cannot be upheld before then unless they have already replied.',
    };
  }

  if (decision !== 'upheld') {
    /*
      A dismissed report gets a deletion date, not a publication date.

      `expiresAt` means the same thing in both branches — the day this row
      stops existing — and it is set here rather than left null so that the
      retention policy is a property of the record instead of a paragraph in a
      document. A row with no deletion date is a row nobody deletes.
    */
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + NOT_UPHELD_RETENTION_MONTHS);
    return { ok: true, status: decision, publishedAt: null, expiresAt };
  }

  return {
    ok: true,
    status: 'upheld',
    publishedAt: now,
    expiresAt: monthsAfter(now, PUBLICATION_MONTHS),
  };
}

/** When the reported party's window closes. */
/**
 * Whether a stored report is past the day it should stop existing.
 *
 * The counterpart to `isPublic`: that one answers what a stranger may see,
 * this one answers what anybody may still hold. A dismissed report kept past
 * its retention date is a file on a person that no process is watching, which
 * is the thing the retention date exists to prevent.
 */
export function isPurgeable(report: Report, now: Date): boolean {
  if (report.expiresAt === null) return false;
  return report.expiresAt.getTime() <= now.getTime();
}

export function replyDeadline(submittedAt: Date): Date {
  return new Date(submittedAt.getTime() + REPLY_WINDOW_DAYS * 86_400_000);
}

/**
 * What the public lookup says about a number.
 *
 * Counts only. No reporter, no description, no evidence, and no report that
 * has not been upheld. `reporterId` is never returned to any client in any
 * role, including to the person reported — see the data model.
 */
export interface Standing {
  readonly upheld: number;
  readonly categories: readonly ReportCategory[];
  readonly mostRecent: Date | null;
  /** Whether every published report here gave the accused a chance to answer. */
  readonly everyReportHadRightOfReply: boolean;
}

export function standing(reports: readonly Report[], now: Date): Standing {
  const shown = reports.filter((r) => isPublic(r, now));

  return {
    upheld: shown.length,
    categories: [...new Set(shown.map((r) => r.category))].sort(),
    mostRecent: shown.reduce<Date | null>(
      (latest, r) =>
        r.publishedAt !== null && (latest === null || r.publishedAt > latest)
          ? r.publishedAt
          : latest,
      null,
    ),
    // Reported alongside the count rather than assumed. A reader deciding
    // whether to trust this is entitled to know whether the other side was
    // asked, and a registry that cannot say so is one nobody should believe.
    everyReportHadRightOfReply: shown.every((r) => r.hasReply),
  };
}

function monthsAfter(from: Date, months: number): Date {
  const to = new Date(from.getTime());
  to.setMonth(to.getMonth() + months);
  return to;
}
