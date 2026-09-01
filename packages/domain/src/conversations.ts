/**
 * Talking to an agent without giving them your number.
 *
 * The default in every Nigerian property listing is a phone number in the
 * advert, and everything bad follows from it. A tenant who enquires about one
 * flat is called about six others for a year. A number posted publicly is
 * scraped. And an agent who has your number before you have seen anything has
 * all the leverage in the conversation.
 *
 * So the number is the *last* thing exchanged rather than the first, and it is
 * exchanged only when both people have said so. Everything before that goes
 * through Keys.
 *
 * ## What this is not
 *
 * Not encryption, and this file does not pretend otherwise. Keys can read
 * every message; the reviewer console needs to, because a report about what an
 * agent said is unanswerable without it. What this protects is the *number* —
 * the thing that outlives the conversation and follows somebody around.
 */

/**
 * Who said it.
 *
 * `keys` is for the messages the product itself writes into a conversation —
 * "contact details were exchanged", "this listing lost its badge". They belong
 * in the thread because that is where somebody will look for them, and they
 * must be impossible to forge as either party.
 */
export const SPEAKERS = ['tenant', 'agent', 'keys'] as const;
export type Speaker = (typeof SPEAKERS)[number];

/**
 * How far a conversation has got towards exchanging numbers.
 *
 * Deliberately not a boolean pair. `tenant_offered` and `agent_offered` are
 * different states with different next actions, and collapsing them into two
 * flags means every reader of this reimplements the ladder.
 */
export const EXCHANGE_STATES = [
  /** Nobody has offered. The starting state and the common one. */
  'none',
  /** The tenant has offered theirs and is waiting. */
  'tenant_offered',
  /** The agent has offered theirs and is waiting. */
  'agent_offered',
  /** Both agreed. Numbers are visible to both, and to nobody else. */
  'exchanged',
] as const;
export type ExchangeState = (typeof EXCHANGE_STATES)[number];

/**
 * ## Where the number lives
 *
 * Not on the account. Every phone number in this product is stored as a hash,
 * because the only thing the rest of the system does with one is *match* it —
 * you report a number and Keys looks for it. A hash cannot be revealed, which
 * looks at first like a problem for a feature whose whole job is revealing a
 * number.
 *
 * It is not. The number is supplied at the moment somebody offers it, and
 * stored on the conversation rather than the account. That is better than
 * un-hashing an account would have been:
 *
 *  - the hashing invariant survives everywhere else, so there is exactly one
 *    place in the schema a readable number can be read from, and it is the
 *    place whose entire purpose is to be read from once;
 *  - the number shared is a decision per conversation, which is what people
 *    actually do — a work number for one agent and not for another;
 *  - a conversation where nobody offered contains no number at all, so there
 *    is nothing to leak from the common case;
 *  - and an offer nobody answered can be withdrawn, which deletes it.
 */
export interface Conversation {
  readonly id: string;
  readonly listingId: string;
  readonly tenantId: string;
  readonly agentId: string;
  readonly exchange: ExchangeState;
  readonly startedAt: Date;
}

/**
 * Taking back an offer nobody answered.
 *
 * Only before an exchange. Afterwards the other party has already read it and
 * a button claiming otherwise would be a promise this cannot keep — the honest
 * thing is to refuse rather than to pretend to un-send.
 */
export function mayWithdrawOffer(state: ExchangeState, by: 'tenant' | 'agent'): boolean {
  return by === 'tenant' ? state === 'tenant_offered' : state === 'agent_offered';
}

/**
 * What an offer does to the state.
 *
 * A pure function of the state and who is offering, so that "both agreed"
 * cannot be reached by any sequence other than both of them agreeing. The
 * server calls this; nothing else decides.
 */
export function offerContact(state: ExchangeState, by: 'tenant' | 'agent'): ExchangeState {
  if (state === 'exchanged') return 'exchanged';
  if (by === 'tenant') {
    // The agent was already waiting, so this completes it.
    return state === 'agent_offered' ? 'exchanged' : 'tenant_offered';
  }
  return state === 'tenant_offered' ? 'exchanged' : 'agent_offered';
}

/**
 * Whether this party may see the other's number.
 *
 * One function, asked on every read. There is no "contact" field that becomes
 * populated: the number is attached to a response or it is not, decided here,
 * every time. A stored copy of somebody's number in a conversation row would
 * be a second place it could leak from.
 */
export function maySeeContact(state: ExchangeState): boolean {
  return state === 'exchanged';
}

/**
 * A message long enough to say something and short enough not to be a payload.
 *
 * Two thousand characters. Nobody negotiating a flat needs more, and a limit
 * is the difference between a message store and a file host.
 */
export const MAX_MESSAGE_LENGTH = 2_000;

/**
 * Digits that look like a Nigerian phone number, wherever they are hiding.
 *
 * Not a validator — a *detector*, and deliberately a loose one. Somebody
 * typing "zero eight zero three..." will get through and that is fine; the
 * point is not to make it impossible to pass a number, which is not achievable
 * and not really the goal. The goal is that the obvious path — pasting your
 * number into the first message — does not silently work, because a tenant who
 * does that has given away the thing this whole mechanism exists to protect
 * without ever deciding to.
 *
 * Separators are stripped first, so `080-3-123-4567` counts.
 */
export function looksLikeAPhoneNumber(text: string): boolean {
  const digits = text.replace(/[\s\-().+]/g, '');
  // Nigerian mobile numbers are 11 digits locally (0803…) or 13 with 234.
  return /\d{10,}/.test(digits);
}
