/**
 * A maintenance ticket is an append-only history whose state is derived
 * (ADR-0012, FR-6.4). The allowed transitions are data a test asserts
 * exactly; nothing is updated in place and nothing is deleted — a reopened
 * ticket is a new event on the same history, and both parties see all of it.
 */

export const TICKET_STATES = ['open', 'acknowledged', 'assigned', 'in_progress', 'resolved', 'closed'] as const;
export type TicketState = (typeof TICKET_STATES)[number];

export const TICKET_CATEGORIES = ['plumbing', 'electrical', 'structural', 'security', 'pests', 'appliance', 'other'] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

/** Who may move a ticket along which edge. The tenant opens, reopens and closes; the letting side does the rest. */
export type Party = 'tenant' | 'letting';

export const TICKET_EDGES: ReadonlyArray<readonly [from: TicketState, to: TicketState, by: Party]> = [
  ['open', 'acknowledged', 'letting'],
  ['acknowledged', 'assigned', 'letting'],
  ['assigned', 'in_progress', 'letting'],
  ['acknowledged', 'in_progress', 'letting'],
  ['in_progress', 'resolved', 'letting'],
  ['assigned', 'resolved', 'letting'],
  ['acknowledged', 'resolved', 'letting'],
  ['resolved', 'closed', 'tenant'],
  ['resolved', 'open', 'tenant'],
  ['closed', 'open', 'tenant'],
];

export type TicketEvent =
  | { readonly kind: 'opened'; readonly by: string; readonly party: 'tenant'; readonly at: Date; readonly category: TicketCategory; readonly description: string; readonly photoHashes: readonly string[] }
  | { readonly kind: 'moved'; readonly by: string; readonly party: Party; readonly at: Date; readonly to: TicketState; readonly note: string | null }
  | { readonly kind: 'noted'; readonly by: string; readonly party: Party; readonly at: Date; readonly note: string; readonly photoHashes: readonly string[] };

export interface Ticket {
  readonly id: string;
  readonly tenancyId: string;
  readonly events: readonly TicketEvent[];
}

export function stateOf(t: Ticket): TicketState {
  let state: TicketState = 'open';
  for (const e of t.events) if (e.kind === 'moved') state = e.to;
  return state;
}

/** Whether this party may move the ticket from where it is to `to`. */
export function mayMove(t: Ticket, to: TicketState, party: Party): boolean {
  const from = stateOf(t);
  return TICKET_EDGES.some(([f, tt, p]) => f === from && tt === to && p === party);
}

/** The moves a party can make right now, for a screen to offer and nothing else. */
export function movesFor(t: Ticket, party: Party): readonly TicketState[] {
  const from = stateOf(t);
  return TICKET_EDGES.filter(([f, , p]) => f === from && p === party).map(([, to]) => to);
}

export function open(id: string, tenancyId: string, by: string, at: Date, category: TicketCategory, description: string, photoHashes: readonly string[]): Ticket {
  return { id, tenancyId, events: [{ kind: 'opened', by, party: 'tenant', at, category, description, photoHashes }] };
}

/** Appends or refuses; never mutates. */
export function move(t: Ticket, by: string, party: Party, at: Date, to: TicketState, note: string | null): Ticket | null {
  if (!mayMove(t, to, party)) return null;
  return { ...t, events: [...t.events, { kind: 'moved', by, party, at, to, note }] };
}

export function note(t: Ticket, by: string, party: Party, at: Date, text: string, photoHashes: readonly string[]): Ticket {
  return { ...t, events: [...t.events, { kind: 'noted', by, party, at, note: text, photoHashes }] };
}

/** Days a ticket has sat unacknowledged, for a portfolio to show — a fact, not a score. */
export function daysWaiting(t: Ticket, now: Date): number | null {
  if (stateOf(t) !== 'open') return null;
  const opened = t.events.find((e) => e.kind === 'opened');
  const lastOpen = [...t.events].reverse().find((e) => e.kind === 'moved' && e.to === 'open');
  const since = lastOpen?.at ?? opened?.at;
  return since ? Math.floor((now.getTime() - since.getTime()) / (24 * 60 * 60_000)) : null;
}
