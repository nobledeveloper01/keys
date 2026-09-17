/**
 * A tenancy is a record (ADR-0009): the agreement both signed, the schedule
 * it implies, the payments the letting side recorded and the tenant may
 * dispute, and the receipts both hold. Keys never collects, holds, transfers
 * or asks for money; the schema has no transaction column; "balance" is not a
 * word here. Every entry is appended, never edited — a wrong amount is
 * corrected by a new entry that says so.
 */

/** The template's version rides on the agreement for ever (ADR-0012). */
export const AGREEMENT_TEMPLATE_VERSION = 'ng-tenancy-2026-09';

/** Whether the shipped template has been read by a lawyer. R17 flips this; until then every screen says so. */
export const TEMPLATE_LEGALLY_REVIEWED = false;

export type RentPeriod = 'monthly' | 'quarterly' | 'yearly';

export interface Agreement {
  readonly templateVersion: string;
  readonly propertyId: string;
  /** Both are account ids, never numbers (ADR-0010). */
  readonly tenantId: string;
  readonly lettingId: string;
  /** Rent for one period, in kobo. */
  readonly rentKobo: number;
  readonly period: RentPeriod;
  /** Whole periods the agreement runs for. */
  readonly periods: number;
  readonly cautionDepositKobo: number;
  /** The first day, as a calendar date at midnight UTC. */
  readonly startsOn: Date;
}

/** The blanks a template fills; the clauses are the template's and nobody's to edit in the app. */
export const AGREEMENT_BLANKS = ['propertyId', 'tenantId', 'lettingId', 'rentKobo', 'period', 'periods', 'cautionDepositKobo', 'startsOn'] as const;

/**
 * The bytes both parties sign: field order fixed, numbers as decimal, dates
 * as ISO days. The signatures are the parties' device keys over exactly
 * this string; the verification lives where the keys do, not here.
 */
export function agreementMessage(a: Agreement): string {
  return [
    'keys.agreement.v1',
    a.templateVersion,
    a.propertyId,
    a.tenantId,
    a.lettingId,
    String(a.rentKobo),
    a.period,
    String(a.periods),
    String(a.cautionDepositKobo),
    a.startsOn.toISOString().slice(0, 10),
  ].join('\n');
}

export function agreementIsWhole(a: Agreement): boolean {
  return (
    a.templateVersion.length > 0 &&
    a.propertyId.length > 0 &&
    a.tenantId.length > 0 &&
    a.lettingId.length > 0 &&
    a.tenantId !== a.lettingId &&
    Number.isInteger(a.rentKobo) &&
    a.rentKobo > 0 &&
    Number.isInteger(a.periods) &&
    a.periods > 0 &&
    Number.isInteger(a.cautionDepositKobo) &&
    a.cautionDepositKobo >= 0
  );
}

function addPeriods(start: Date, period: RentPeriod, n: number): Date {
  const d = new Date(start.getTime());
  const months = period === 'monthly' ? 1 : period === 'quarterly' ? 3 : 12;
  d.setUTCMonth(d.getUTCMonth() + months * n);
  return d;
}

export interface Due {
  /** 1-based, so a receipt can say "period 3 of 12". */
  readonly index: number;
  readonly dueOn: Date;
  readonly amountKobo: number;
}

/** The schedule the agreement implies: one entry per period, due on the period's first day. */
export function schedule(a: Agreement): readonly Due[] {
  return Array.from({ length: a.periods }, (_, i) => ({ index: i + 1, dueOn: addPeriods(a.startsOn, a.period, i), amountKobo: a.rentKobo }));
}

/** Days before a due date at which the tenant's own phone says a date is coming (FR-6.3). Never "pay". */
export const REMINDER_DAYS = [30, 14, 7] as const;

const DAY_MS = 24 * 60 * 60_000;

/** Which reminder, if any, a given day is — for the tenant's phone to schedule against its own schedule. */
export function reminderOn(due: Due, day: Date): (typeof REMINDER_DAYS)[number] | null {
  const daysLeft = Math.round((due.dueOn.getTime() - day.getTime()) / DAY_MS);
  return (REMINDER_DAYS as readonly number[]).includes(daysLeft) ? (daysLeft as (typeof REMINDER_DAYS)[number]) : null;
}

/**
 * What the letting side wrote down, and what the tenant said about it. Each
 * is an entry; entries are never edited. A `corrects` entry replaces the
 * amount of an earlier one for the arithmetic and leaves it in the record.
 */
export type TenancyEntry =
  | { readonly kind: 'agreement_signed'; readonly by: string; readonly at: Date; readonly signature: string }
  | { readonly kind: 'payment_recorded'; readonly id: string; readonly by: string; readonly at: Date; readonly periodIndex: number; readonly amountKobo: number; readonly receivedOn: Date; readonly note: string | null }
  | { readonly kind: 'payment_corrected'; readonly id: string; readonly by: string; readonly at: Date; readonly corrects: string; readonly amountKobo: number; readonly note: string }
  | { readonly kind: 'payment_disputed'; readonly by: string; readonly at: Date; readonly disputes: string; readonly note: string }
  | { readonly kind: 'ended'; readonly by: string; readonly at: Date; readonly note: string | null };

export interface Tenancy {
  readonly id: string;
  readonly agreement: Agreement;
  readonly entries: readonly TenancyEntry[];
}

/** Both parties have signed the same bytes; before that it is a draft either may still walk away from. */
export function agreementSigned(t: Tenancy): boolean {
  const signed = new Set(t.entries.filter((e) => e.kind === 'agreement_signed').map((e) => e.by));
  return signed.has(t.agreement.tenantId) && signed.has(t.agreement.lettingId);
}

export function ended(t: Tenancy): boolean {
  return t.entries.some((e) => e.kind === 'ended');
}

/** Who may append what. The tenant disputes; the letting side records and corrects; either ends. */
export function mayAppend(t: Tenancy, entry: TenancyEntry): boolean {
  const tenant = t.agreement.tenantId;
  const letting = t.agreement.lettingId;
  if (ended(t)) return false;
  switch (entry.kind) {
    case 'agreement_signed':
      return (entry.by === tenant || entry.by === letting) && !t.entries.some((e) => e.kind === 'agreement_signed' && e.by === entry.by);
    case 'payment_recorded':
    case 'payment_corrected':
      return entry.by === letting && agreementSigned(t);
    case 'payment_disputed':
      return entry.by === tenant && t.entries.some((e) => (e.kind === 'payment_recorded' || e.kind === 'payment_corrected') && e.id === entry.disputes);
    case 'ended':
      return entry.by === tenant || entry.by === letting;
  }
}

export interface PeriodStanding {
  readonly due: Due;
  /** Recorded against this period after corrections, in kobo. Labelled *recorded*, never *paid* or *balance*. */
  readonly recordedKobo: number;
  readonly disputed: boolean;
}

/** The arithmetic over the record: per period, what was recorded after corrections, and whether the tenant disputes any of it. */
export function rentStanding(t: Tenancy): readonly PeriodStanding[] {
  const corrected = new Map<string, number>();
  for (const e of t.entries) if (e.kind === 'payment_corrected') corrected.set(e.corrects, e.amountKobo);
  const disputed = new Set(t.entries.filter((e) => e.kind === 'payment_disputed').map((e) => e.disputes));
  return schedule(t.agreement).map((due) => {
    let recordedKobo = 0;
    let isDisputed = false;
    for (const e of t.entries) {
      if (e.kind !== 'payment_recorded' || e.periodIndex !== due.index) continue;
      recordedKobo += corrected.get(e.id) ?? e.amountKobo;
      if (disputed.has(e.id)) isDisputed = true;
    }
    return { due, recordedKobo, disputed: isDisputed };
  });
}

export interface Receipt {
  readonly tenancyId: string;
  readonly paymentId: string;
  readonly periodIndex: number;
  readonly periods: number;
  readonly amountKobo: number;
  readonly receivedOn: Date;
  readonly recordedBy: string;
  readonly recordedAt: Date;
  /** Present when a later entry changed the amount; the receipt says so rather than pretending. */
  readonly correctedToKobo: number | null;
}

/** The receipts the record implies — one per recorded payment, carrying any correction rather than hiding it. */
export function receipts(t: Tenancy): readonly Receipt[] {
  const corrected = new Map<string, number>();
  for (const e of t.entries) if (e.kind === 'payment_corrected') corrected.set(e.corrects, e.amountKobo);
  return t.entries
    .filter((e): e is Extract<TenancyEntry, { kind: 'payment_recorded' }> => e.kind === 'payment_recorded')
    .map((e) => ({
      tenancyId: t.id,
      paymentId: e.id,
      periodIndex: e.periodIndex,
      periods: t.agreement.periods,
      amountKobo: e.amountKobo,
      receivedOn: e.receivedOn,
      recordedBy: e.by,
      recordedAt: e.at,
      correctedToKobo: corrected.get(e.id) ?? null,
    }));
}

/** The receipt as text both parties can hold and hand over; the signature over it is the letting side's device key, verified where keys live. */
export function receiptText(r: Receipt): string {
  const corrected = r.correctedToKobo === null ? '' : `\ncorrected to: ${r.correctedToKobo} kobo`;
  return `keys.receipt.v1\ntenancy: ${r.tenancyId}\npayment: ${r.paymentId}\nperiod: ${r.periodIndex} of ${r.periods}\nrecorded: ${r.amountKobo} kobo\nreceived on: ${r.receivedOn.toISOString().slice(0, 10)}\nrecorded by: ${r.recordedBy}\nrecorded at: ${r.recordedAt.toISOString()}${corrected}\nKeys recorded this; it did not receive, hold or move the money.`;
}
