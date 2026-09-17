/**
 * A city is data (ADR-0016): a name, a box, and its named areas with their
 * centres. A listing belongs to the city whose box contains it, and to the
 * nearest area centre inside that city. There is no city field anywhere to
 * set and none to get wrong.
 */
import { metresBetween, type Point } from './places.ts';

export interface Area {
  readonly id: string;
  readonly name: string;
  readonly centre: Point;
}

export interface City {
  readonly id: CityId;
  readonly name: string;
  readonly box: { readonly north: number; readonly south: number; readonly east: number; readonly west: number };
  readonly areas: readonly Area[];
}

export type CityId = 'lagos' | 'abuja' | 'port_harcourt';

const area = (id: string, name: string, latitude: number, longitude: number): Area => ({ id, name, centre: { latitude, longitude } });

export const CITIES: readonly City[] = [
  {
    id: 'lagos',
    name: 'Lagos',
    box: { north: 6.75, south: 6.35, east: 3.75, west: 3.05 },
    areas: [
      area('lagos:yaba', 'Yaba', 6.5095, 3.3711),
      area('lagos:ikeja', 'Ikeja', 6.6018, 3.3515),
      area('lagos:surulere', 'Surulere', 6.4969, 3.3553),
      area('lagos:lekki', 'Lekki', 6.4478, 3.4723),
      area('lagos:victoria_island', 'Victoria Island', 6.4281, 3.4219),
      area('lagos:ikoyi', 'Ikoyi', 6.4549, 3.4346),
      area('lagos:ajah', 'Ajah', 6.4698, 3.5852),
      area('lagos:gbagada', 'Gbagada', 6.5535, 3.3894),
      area('lagos:maryland', 'Maryland', 6.5726, 3.3660),
      area('lagos:festac', 'Festac', 6.4655, 3.2830),
      area('lagos:ikorodu', 'Ikorodu', 6.6194, 3.5105),
      area('lagos:agege', 'Agege', 6.6155, 3.3208),
      area('lagos:ojodu', 'Ojodu', 6.6412, 3.3661),
      area('lagos:magodo', 'Magodo', 6.6175, 3.3796),
      area('lagos:marina', 'Marina', 6.4507, 3.3939),
    ],
  },
  {
    id: 'abuja',
    name: 'Abuja',
    box: { north: 9.20, south: 8.85, east: 7.65, west: 7.25 },
    areas: [
      area('abuja:wuse', 'Wuse', 9.0692, 7.4787),
      area('abuja:garki', 'Garki', 9.0333, 7.4890),
      area('abuja:maitama', 'Maitama', 9.0884, 7.4979),
      area('abuja:asokoro', 'Asokoro', 9.0463, 7.5251),
      area('abuja:gwarinpa', 'Gwarinpa', 9.1094, 7.4123),
      area('abuja:jabi', 'Jabi', 9.0674, 7.4356),
      area('abuja:utako', 'Utako', 9.0666, 7.4487),
      area('abuja:lugbe', 'Lugbe', 8.9784, 7.3757),
      area('abuja:kubwa', 'Kubwa', 9.1607, 7.3384),
      area('abuja:central', 'Central Area', 9.0522, 7.4891),
    ],
  },
  {
    id: 'port_harcourt',
    name: 'Port Harcourt',
    box: { north: 4.95, south: 4.72, east: 7.15, west: 6.90 },
    areas: [
      area('port_harcourt:gra', 'GRA', 4.8156, 7.0200),
      area('port_harcourt:trans_amadi', 'Trans Amadi', 4.8130, 7.0530),
      area('port_harcourt:rumuola', 'Rumuola', 4.8470, 7.0130),
      area('port_harcourt:rumuokoro', 'Rumuokoro', 4.8760, 7.0140),
      area('port_harcourt:diobu', 'Diobu', 4.7930, 6.9960),
      area('port_harcourt:eliozu', 'Eliozu', 4.8800, 7.0370),
      area('port_harcourt:woji', 'Woji', 4.8320, 7.0680),
      area('port_harcourt:choba', 'Choba', 4.8930, 6.9060),
    ],
  },
];

export function isCityId(s: string): s is CityId {
  return CITIES.some((c) => c.id === s);
}

export function city(id: CityId): City {
  return CITIES.find((c) => c.id === id)!;
}

/** The city whose box contains the point, or null — a listing outside every box belongs to no city. */
export function cityOf(point: Point): City | null {
  return CITIES.find((c) => point.latitude <= c.box.north && point.latitude >= c.box.south && point.longitude <= c.box.east && point.longitude >= c.box.west) ?? null;
}

/** The nearest named area in the point's city, within `withinM` of its centre; null when there is none. */
export const AREA_WITHIN_M = 4_000;
export function areaOf(point: Point, withinM = AREA_WITHIN_M): Area | null {
  const c = cityOf(point);
  if (!c) return null;
  let best: Area | null = null;
  let bestM = Infinity;
  for (const a of c.areas) {
    const m = metresBetween(point, a.centre);
    if (m < bestM) {
      bestM = m;
      best = a;
    }
  }
  return best !== null && bestM <= withinM ? best : null;
}

export function areaById(id: string): Area | null {
  for (const c of CITIES) for (const a of c.areas) if (a.id === id) return a;
  return null;
}
