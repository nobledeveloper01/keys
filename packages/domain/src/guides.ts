/**
 * An area guide is what tenants answered (ADR-0014): four closed questions,
 * counted per answer, shown only above a floor of five separate tenants,
 * never as a verdict, never with a date finer than a month, never with a
 * person in it.
 */

export const POWER_BANDS = ['under_4h', '4_to_8h', '8_to_16h', 'over_16h'] as const;
export const WATER_SOURCES = ['borehole', 'public_supply', 'water_vendor', 'well'] as const;
export const TRANSPORT_MODES = ['bus', 'keke', 'okada', 'brt', 'train', 'ferry'] as const;
export const MARKET_BANDS = ['walking', 'short_ride', 'far'] as const;

export interface Answer {
  readonly tenantId: string;
  readonly areaId: string;
  /** The month, as `YYYY-MM`. Never a finer date, so a guide cannot be walked back to a day and a person. */
  readonly month: string;
  readonly power: (typeof POWER_BANDS)[number];
  readonly water: (typeof WATER_SOURCES)[number];
  readonly transport: readonly (typeof TRANSPORT_MODES)[number][];
  readonly market: (typeof MARKET_BANDS)[number];
}

export const GUIDE_FLOOR = 5;

export interface Guide {
  readonly areaId: string;
  readonly answers: number;
  readonly power: Readonly<Record<(typeof POWER_BANDS)[number], number>>;
  readonly water: Readonly<Record<(typeof WATER_SOURCES)[number], number>>;
  readonly transport: Readonly<Record<(typeof TRANSPORT_MODES)[number], number>>;
  readonly market: Readonly<Record<(typeof MARKET_BANDS)[number], number>>;
}

function counts<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

/** Only the latest answer per tenant counts; below the floor the guide is null and the screen says *not enough answers yet*. */
export function guideFor(areaId: string, answers: readonly Answer[]): Guide | null {
  const latest = new Map<string, Answer>();
  for (const a of answers) if (a.areaId === areaId) latest.set(a.tenantId, a);
  if (latest.size < GUIDE_FLOOR) return null;
  const power = counts(POWER_BANDS);
  const water = counts(WATER_SOURCES);
  const transport = counts(TRANSPORT_MODES);
  const market = counts(MARKET_BANDS);
  for (const a of latest.values()) {
    power[a.power] += 1;
    water[a.water] += 1;
    for (const m of new Set(a.transport)) transport[m] += 1;
    market[a.market] += 1;
  }
  return { areaId, answers: latest.size, power, water, transport, market };
}

export function isPowerBand(s: string): s is (typeof POWER_BANDS)[number] {
  return (POWER_BANDS as readonly string[]).includes(s);
}
export function isWaterSource(s: string): s is (typeof WATER_SOURCES)[number] {
  return (WATER_SOURCES as readonly string[]).includes(s);
}
export function isTransportMode(s: string): s is (typeof TRANSPORT_MODES)[number] {
  return (TRANSPORT_MODES as readonly string[]).includes(s);
}
export function isMarketBand(s: string): s is (typeof MARKET_BANDS)[number] {
  return (MARKET_BANDS as readonly string[]).includes(s);
}
