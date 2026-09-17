/**
 * The condition record (ADR-0011, FR-6.5): Snag's model in this domain.
 * Rooms of items; an item is a caption, a photograph's hash and a verdict —
 * `snag` or `fine`, and *fine* is a real answer. The record encodes to
 * canonical bytes the domain owns; each party's acknowledgement is a
 * signature over those bytes with their device key, verified where keys
 * live. Before both have signed it is a draft; after, nothing changes it.
 */

export type Verdict = 'snag' | 'fine';

export interface Item {
  readonly caption: string;
  /** SHA-256 of the photograph's bytes, hex, taken the moment it was captured. */
  readonly photoHash: string;
  readonly verdict: Verdict;
}

export interface Room {
  readonly name: string;
  readonly items: readonly Item[];
}

export type Walk = 'move_in' | 'move_out';

export interface ConditionRecord {
  readonly id: string;
  readonly tenancyId: string;
  readonly walk: Walk;
  /** A move-out references the move-in it is compared against. */
  readonly comparesTo: string | null;
  readonly rooms: readonly Room[];
  readonly takenAt: Date;
}

export interface Acknowledgement {
  readonly by: string;
  readonly at: Date;
  /** Over `recordMessage(record)`, with the party's device key. */
  readonly signature: string;
}

/** Templates name the rooms before the walk, as Snag's do. */
export const ROOM_TEMPLATES: Readonly<Record<string, readonly string[]>> = {
  self_contain: ['Room', 'Kitchen', 'Bathroom'],
  one_bedroom: ['Living room', 'Bedroom', 'Kitchen', 'Bathroom'],
  two_bedroom: ['Living room', 'Bedroom 1', 'Bedroom 2', 'Kitchen', 'Bathroom', 'Toilet', 'Balcony'],
  three_bedroom: ['Living room', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3', 'Kitchen', 'Bathroom 1', 'Bathroom 2', 'Store'],
};

/** What a Lagos flat has and a tenant forgets. */
export const PROMPTS: readonly string[] = ['Meter', 'Water heater', 'Burglary bars', 'Sockets', 'Tiles', 'Tap', 'Sink', 'Door lock', 'Window', 'Ceiling', 'Paint'];

function escape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\|/g, '\\|');
}

/**
 * The canonical bytes: one line per item in room order, every field
 * escaped, the header carrying what the record is. Two records with the
 * same content encode identically whatever order their objects were built.
 */
export function recordMessage(r: ConditionRecord): string {
  const lines = [`keys.condition.v1|${r.id}|${r.tenancyId}|${r.walk}|${r.comparesTo ?? ''}|${r.takenAt.toISOString()}`];
  for (const room of r.rooms) {
    for (const item of room.items) lines.push(`${escape(room.name)}|${escape(item.caption)}|${item.photoHash}|${item.verdict}`);
    if (room.items.length === 0) lines.push(`${escape(room.name)}|||`);
  }
  return lines.join('\n');
}

/** Both parties, distinct, each once. Anything less is a draft. */
export function acknowledgedByBoth(acks: readonly Acknowledgement[], tenantId: string, lettingId: string): boolean {
  const who = new Set(acks.map((a) => a.by));
  return who.has(tenantId) && who.has(lettingId);
}

export function recordIsWhole(r: ConditionRecord): boolean {
  return (
    r.id.length > 0 &&
    r.rooms.length > 0 &&
    r.rooms.every((room) => room.name.trim().length > 0 && room.items.every((i) => /^[0-9a-f]{64}$/.test(i.photoHash) && i.caption.trim().length > 0)) &&
    (r.walk === 'move_in' ? r.comparesTo === null : r.comparesTo !== null)
  );
}

export interface RoomChange {
  readonly room: string;
  /** Captions that were fine at move-in and are snags now. */
  readonly newSnags: readonly string[];
  /** Captions that were snags at move-in and are fine now. */
  readonly fixed: readonly string[];
  /** Captions present at move-in and absent now, and the reverse. */
  readonly missing: readonly string[];
  readonly added: readonly string[];
}

/**
 * Move-out beside move-in, per room (FR-6.5): what changed, as a list of
 * differences. Never a number about money — that is the tenancy lawyer's,
 * and Snag's rule too.
 */
export function compare(moveIn: ConditionRecord, moveOut: ConditionRecord): readonly RoomChange[] {
  const names = [...new Set([...moveIn.rooms.map((r) => r.name), ...moveOut.rooms.map((r) => r.name)])];
  return names.map((name) => {
    const before = new Map((moveIn.rooms.find((r) => r.name === name)?.items ?? []).map((i) => [i.caption, i.verdict]));
    const after = new Map((moveOut.rooms.find((r) => r.name === name)?.items ?? []).map((i) => [i.caption, i.verdict]));
    const newSnags: string[] = [];
    const fixed: string[] = [];
    const missing: string[] = [];
    const added: string[] = [];
    for (const [caption, was] of before) {
      const now = after.get(caption);
      if (now === undefined) missing.push(caption);
      else if (was === 'fine' && now === 'snag') newSnags.push(caption);
      else if (was === 'snag' && now === 'fine') fixed.push(caption);
    }
    for (const caption of after.keys()) if (!before.has(caption)) added.push(caption);
    return { room: name, newSnags, fixed, missing, added };
  });
}

/** True when nothing in any room changed; the honest sentence is then *as at move-in*. */
export function unchanged(changes: readonly RoomChange[]): boolean {
  return changes.every((c) => c.newSnags.length === 0 && c.fixed.length === 0 && c.missing.length === 0 && c.added.length === 0);
}
