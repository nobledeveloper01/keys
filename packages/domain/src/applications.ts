/**
 * An application is the tenant's own words handed to one agent for one
 * listing, with a status from a closed list the tenant sees every change of
 * (ADR-0015). Keys computes nothing about the tenant: the only facts it adds
 * are ones the tenant can see on their own screen.
 */

export const APPLICATION_STATES = ['submitted', 'seen', 'shortlisted', 'offered', 'declined', 'withdrawn'] as const;
export type ApplicationState = (typeof APPLICATION_STATES)[number];

/** The tenant's own words, in fixed fields. No income field, no score, nothing named risk. */
export interface Profile {
  readonly occupation: string;
  readonly householdSize: number;
  /** As `YYYY-MM-DD`. */
  readonly moveInBy: string;
  readonly note: string;
}

/** What Keys adds: facts the tenant sees on their own screen, and nothing computed from them. */
export interface TenantStanding {
  readonly accountAgeDays: number;
  readonly tenanciesRecorded: number;
}

export type ApplicationEvent =
  | { readonly kind: 'submitted'; readonly by: string; readonly at: Date }
  | { readonly kind: 'moved'; readonly by: string; readonly at: Date; readonly to: Exclude<ApplicationState, 'submitted'> };

export interface Application {
  readonly id: string;
  readonly listingId: string;
  readonly tenantId: string;
  readonly agentId: string;
  readonly profile: Profile;
  readonly standing: TenantStanding;
  readonly events: readonly ApplicationEvent[];
}

/** The edges: the agent moves it forward or declines; the tenant withdraws at any open state. */
export const APPLICATION_EDGES: ReadonlyArray<readonly [from: ApplicationState, to: ApplicationState, by: 'agent' | 'tenant']> = [
  ['submitted', 'seen', 'agent'],
  ['seen', 'shortlisted', 'agent'],
  ['shortlisted', 'offered', 'agent'],
  ['submitted', 'declined', 'agent'],
  ['seen', 'declined', 'agent'],
  ['shortlisted', 'declined', 'agent'],
  ['submitted', 'withdrawn', 'tenant'],
  ['seen', 'withdrawn', 'tenant'],
  ['shortlisted', 'withdrawn', 'tenant'],
  ['offered', 'withdrawn', 'tenant'],
];

export const OPEN_STATES: ReadonlySet<ApplicationState> = new Set(['submitted', 'seen', 'shortlisted', 'offered']);

export function stateOfApplication(a: Application): ApplicationState {
  let s: ApplicationState = 'submitted';
  for (const e of a.events) if (e.kind === 'moved') s = e.to;
  return s;
}

export function isOpen(a: Application): boolean {
  return OPEN_STATES.has(stateOfApplication(a));
}

export function mayMoveApplication(a: Application, to: ApplicationState, by: 'agent' | 'tenant'): boolean {
  const from = stateOfApplication(a);
  return APPLICATION_EDGES.some(([f, t, p]) => f === from && t === to && p === by);
}

export function applicationMovesFor(a: Application, by: 'agent' | 'tenant'): readonly ApplicationState[] {
  const from = stateOfApplication(a);
  return APPLICATION_EDGES.filter(([f, , p]) => f === from && p === by).map(([, t]) => t);
}

export function profileIsWhole(p: Profile): boolean {
  return p.occupation.trim().length > 0 && Number.isInteger(p.householdSize) && p.householdSize >= 1 && p.householdSize <= 20 && /^\d{4}-\d{2}-\d{2}$/.test(p.moveInBy) && p.note.length <= 1000;
}

/** One open application per tenant per listing; a closed one can be followed by a new one. */
export function mayApply(existing: readonly Application[], tenantId: string, listingId: string): boolean {
  return !existing.some((a) => a.tenantId === tenantId && a.listingId === listingId && isOpen(a));
}
