# 6. "A reviewer" is not an answer to "who decided this"

Date: 2026-08-30

## Status

Accepted

## Context

The review console shipped behind a single shared token. Everything it did was
correctly gated — no unreviewed report is reachable without it — but every
action it took was anonymous, and the `reports` table recorded only the outcome.

That is fine for a queue of internal tasks. It is not fine here. Each decision
publishes, or declines to publish, a public accusation about a named person. A
year from now one of them may be challenged by that person, by a lawyer, or in
front of a regulator, and the only questions that matter will be *who decided
this, when, and on what basis*. "The reports table says upheld" answers none of
them.

Section 4 of the backend spec has always asked for reviewer attribution and
audit on every action. It was written down and not built, which is the defect
this codebase keeps finding in itself.

## Decision

**Every action in the console names a person and states a reason, and both are
recorded before the action is considered done.**

- `KEYS_REVIEWERS` holds `name:token` pairs. The guard resolves the presented
  token to a named reviewer and attaches it to the request. Tokens are compared
  in constant time over a SHA-256 digest, so the comparison length does not
  depend on what was presented — the obvious `if (a.length !== b.length)` in
  front of `timingSafeEqual` is itself the leak it is trying to prevent.
- **Reasoning is mandatory on every decision**, with a length floor. This is not
  bureaucracy: a field that accepts "looks legit" is a field that will mostly
  contain it, and the sentence recorded here is the one somebody reads when they
  are asked to justify a published claim.
- The `decisions` table is append-only by intent — no code path updates or
  deletes a row — with `CHECK` constraints on the action and on the reasoning
  length, for the same reason the `reports` constraints exist
  ([ADR-0005](0005-a-rule-this-serious-lives-in-three-places.md)).
- `GET /v1/review/metrics` reports decisions by reviewer and by action, plus the
  queue depth and the age of the oldest waiting report.

Real accounts arrive with agent verification in phase 2. This is the smallest
thing that still attributes, and `every-decision-names-a-person.test.ts` exists
so the shortcut cannot become permanent by being untested.

## Consequences

`KEYS_REVIEWER_TOKEN` still works and resolves to a reviewer called
`unattributed` — deliberately an unpleasant thing to find in an audit trail.

**Throughput is now measurable, which is what phase 1's third exit gate needs.**
Keys enters a city at the pace the queue can sustain; the endpoint reports the
depth alongside the rate, because throughput without a backlog reads as healthy
while the backlog is what actually decides whether a city can be opened.

Writing the test found that decisions were not being recorded at all — the audit
call had landed in the evidence handler and not the decision handler, so the
trail existed, was tested against, and silently covered half of what it claimed.
That is the same defect as every other one this week, and it was caught for the
same reason: something asserted the behaviour rather than the intention.
