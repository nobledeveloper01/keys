# 13. A commute is a distance, and never a time

Date: 2026-09-17

## Status

Accepted

## Context

F-406 asks for a commute-time filter from a stated workplace. Every
property portal that offers one draws on a routing vendor and prints a
number of minutes, and the number is wrong in exactly the city this product
is for: a Lagos commute is a function of the hour, the rain and whether
Third Mainland is moving, and a figure that ignores all three is a guess
dressed as a measurement. Backhaul refused to render an estimate as a
measurement for the same reason, and Grid says `unknown` rather than
interpolate.

A routing vendor is also a vendor, and v1.0 ships without any.

## Decision

**Keys filters and shows the straight-line distance from a place the tenant
named, in kilometres, and never says minutes.** *4.2 km from Marina* is a
fact the tenant can turn into a time with what they know about the road;
*25 minutes* would be Keys pretending to know it.

- The workplace is a point the tenant chooses on the phone — typed as an
  area name from the city's list or set from where they are standing — and
  it is sent with the search, never stored on the server.
- The filter is *within N km*; the domain computes the distance with the
  one `metresBetween` this codebase already has; SQL narrows with the same
  bounding box search uses (ADR-0008).
- The word *commute* does not appear on a screen. The screens say *distance
  from* and *within*.

## Consequences

- No routing dependency, no vendor, no API key, and nothing that has to be
  right about traffic.
- A tenant who wants a time asks somebody who lives there — which is what
  the area guide (ADR-0014) is for.
