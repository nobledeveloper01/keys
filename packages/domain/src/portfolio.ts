/**
 * The letting side's view across its tenancies (F-708): what is due soon,
 * what has been recorded against it, which tickets are waiting. Facts from
 * the records, never a score, never a total that mixes two tenancies' money.
 */
import { daysWaiting, stateOf, type Ticket } from './maintenance.ts';
import { agreementSigned, ended, rentStanding, type Tenancy } from './tenancy.ts';

export interface PortfolioRow {
  readonly tenancyId: string;
  readonly propertyId: string;
  readonly signed: boolean;
  /** The next due date on or after `now`, with what is recorded against it so far. */
  readonly nextDueOn: Date | null;
  readonly nextDueKobo: number;
  readonly nextRecordedKobo: number;
  /** Periods before `now` with less recorded than due. A fact for the letting side; the tenant sees the same numbers. */
  readonly periodsShort: number;
  readonly disputed: boolean;
  readonly openTickets: number;
  /** The longest a ticket has sat unacknowledged, in days, or null. */
  readonly longestWaitingDays: number | null;
}

export function portfolio(tenancies: readonly Tenancy[], tickets: readonly Ticket[], now: Date): readonly PortfolioRow[] {
  return tenancies
    .filter((t) => !ended(t))
    .map((t) => {
      const rows = rentStanding(t);
      const next = rows.find((r) => r.due.dueOn.getTime() >= now.getTime()) ?? null;
      const mine = tickets.filter((k) => k.tenancyId === t.id);
      const open = mine.filter((k) => stateOf(k) !== 'closed');
      const waits = mine.map((k) => daysWaiting(k, now)).filter((d): d is number => d !== null);
      return {
        tenancyId: t.id,
        propertyId: t.agreement.propertyId,
        signed: agreementSigned(t),
        nextDueOn: next?.due.dueOn ?? null,
        nextDueKobo: next?.due.amountKobo ?? 0,
        nextRecordedKobo: next?.recordedKobo ?? 0,
        periodsShort: rows.filter((r) => r.due.dueOn.getTime() < now.getTime() && r.recordedKobo < r.due.amountKobo).length,
        disputed: rows.some((r) => r.disputed),
        openTickets: open.length,
        longestWaitingDays: waits.length ? Math.max(...waits) : null,
      };
    });
}
