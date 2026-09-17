# 16. A city is data, and a listing belongs to one by its coordinates

Date: 2026-09-17

## Status

Accepted

## Context

Keys launches Lagos-only and the roadmap adds Abuja and Port Harcourt in
Phase 8. Nothing in the code says *Lagos* — search is a box around a point,
and a listing is wherever its capture put it — which means adding a city
could be done by adding nothing, and then nothing would know which city a
listing is in, which areas it has, or where its guides live.

## Decision

**A city is a row of data the domain carries — a name, a centre, a bounding
box, and its named areas with their centres — and a listing belongs to the
city whose box contains its coordinates.** There is no city field to set
and none to get wrong.

- Three cities ship: Lagos, Abuja, Port Harcourt, each with its areas. A
  listing outside every box belongs to no city and appears in no city
  search; it still appears in a search around a point.
- Search takes an optional city; SQL narrows with the city's box and the
  domain decides membership with the same box, as ADR-0008 requires.
- The workplace filter (ADR-0013) offers the areas of the city being
  searched. The area guide (ADR-0014) keys on a city's area.

## Consequences

- Adding a fourth city is a row and its areas, and every gate that reads the
  list — the phrase check, the doc-drift check — follows.
- 360° tours, the other item this phase named, are not built: they need a
  camera the simulator does not have, and R18 in the ledger says so.
