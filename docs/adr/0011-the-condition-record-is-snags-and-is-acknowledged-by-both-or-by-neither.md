# 11. The condition record is Snag's, and is acknowledged by both or by neither

Date: 2026-09-17

## Status

Accepted

## Context

FR-6.5 asks for a move-in and move-out condition record, room by room, with
photographs, acknowledged by both parties, immutable once acknowledged and
exportable. This portfolio already has that product: Snag, whose whole
argument is that the evidence is worth making on day one, and whose report
is one canonical byte encoding signed with a key that never leaves the phone.

Two designs were considered. Keys could hold a *copy* of a Snag report — but
Snag is iOS only, and a Keys tenant on a Transsion handset has no Snag. Or
Keys could carry the model itself: rooms, items marked snag or fine,
photographs hashed the moment they are taken, a canonical encoding, and the
acknowledgement as a second signature beside the first.

## Decision

**Keys carries Snag's model in its own domain, in TypeScript, with the same
rules and a compatible byte layout — and a record counts only when both
parties have acknowledged the same bytes.**

- A record is rooms of items; an item is a caption, a photograph hash and a
  verdict — `snag` or `fine`. *Fine* is a real answer, as it is in Snag.
- The record encodes to canonical bytes the domain owns. Each party's
  acknowledgement is a signature over those bytes with their device key.
  Before both have signed, the record is a draft either may edit; after,
  nothing changes it, and a later finding is a new record that references
  the old.
- At move-out the same rooms are walked again, and the domain produces the
  side-by-side: for each room, what was there, what is there, and what
  changed — a list of differences, never a number about money (ADR-0009,
  and Snag's own rule).
- The export is text a Python verifier can check with nothing but the
  format document, as Snag's and Sentinel's are.

## Consequences

- The domain gains a `condition` module whose tests are Snag's rules
  restated: a flipped byte fails verification, a record signed by one party
  is a draft, a move-out without a move-in is a move-in.
- Photographs travel through the existing capture path and its media store;
  the record holds hashes, and a hash that no longer matches its file is
  reported as *altered*, never hidden.
