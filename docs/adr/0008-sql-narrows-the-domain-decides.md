# 8. SQL narrows, the domain decides

Date: 2026-09-02

## Status

Accepted

## Context

Search reads every published listing and filters in JavaScript. That is fine for
three listings and will not be fine for thirty thousand, so phase 4 put "Postgres
FTS + PostGIS" on the roadmap.

Both of those turn out to be the wrong instruction, for the same reason, and it
is a reason this codebase has already paid for twice.

**PostGIS would be a second implementation of distance.** `ST_DWithin` and
`metresBetween` are two functions answering "is this within 200 m", and the one
thing this repo has learned the hard way — from `assessListing`, and again from
the BK-tree in the Postgres captures store — is that two implementations of one
rule eventually disagree, and the disagreement is invisible until somebody is
looking at a listing that says two different things. PostGIS is also not
installed on the development database, which made the question concrete rather
than theoretical.

**Full-text search would be a second implementation of matching.** `matches()`
requires every typed word as a *substring*: "yab" finds Yaba. A `tsvector` matches
*lexemes*, so "yab" finds nothing. Whichever way that divergence falls, the
in-memory store and the durable one stop returning the same set, and every test
that passes against memory stops being evidence about production — which is the
entire premise of running each suite against both.

Stemming is wrong here on its own merits too: `to_tsvector('english', 'Ikeja')`
is guessing at the morphology of a Yoruba place name.

## Decision

**SQL narrows the candidate set. The domain decides what is in it.**

Concretely:

- **Text.** A `pg_trgm` GIN index over `title || ' ' || property_id`, queried with
  `ILIKE '%word%'` per word. Trigram `ILIKE` has *exactly* the substring semantics
  `matches()` has, so the index makes the existing rule fast rather than replacing
  it with a different one. `matches()` still runs over what comes back and is
  still the only definition of a match.
- **Geography.** A bounding box in SQL, wide enough to be a superset of the
  radius, and `metresBetween` decides. A box that is slightly too big costs a few
  rows; a box that is too small silently loses a result, so it is computed from
  the radius rather than eyeballed.

The rule for anybody extending this: **a SQL predicate may only remove rows the
domain would also have removed.** If it can remove a row the domain would have
kept, it is not narrowing — it is a second opinion, and it belongs in the domain
or nowhere.

## Consequences

### What this costs

More rows cross the wire than strictly necessary. At Lagos scale that is
nothing, and it stays nothing for a long time: the index does the work, the
domain does the deciding, and the two cannot drift because only one of them is
allowed to have an opinion.

If the surplus ever matters, the fix is a *tighter narrowing* — never a
predicate that decides.

### What this does not change

**Nothing is narrowed on verification.** Phase 4's gate says a search never
returns a listing the searcher could not have seen, and it fails if anything
filters before assessing. SQL may narrow on what a listing *says* — its words,
its coordinates — and never on what Keys *concluded* about it. `is_verified` is
still not a column and still cannot become one.
