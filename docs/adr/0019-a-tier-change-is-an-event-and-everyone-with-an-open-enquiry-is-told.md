# 19. A tier change is an event, and everyone with an open enquiry is told

Date: 2026-09-17

## Status

Accepted

## Context

A tier is computed on every read and stored nowhere (ADR-0001's rule: a
badge is evidence the claimant cannot write). That is right and it has a
cost: a tier that is never stored is a tier whose *change* is never
noticed. An agent whose authority lapses, or whose report is upheld, drops
from `established` silently, and the tenant who opened an enquiry last week
under a badge is talking to somebody without one and is not told.

The obvious fix is to store the tier. That is the thing the rule forbids,
and for a good reason: a stored tier is a field somebody can write.

## Decision

**The server keeps what it last *observed*, not the tier.** Each time an
agent's tier is computed, the result is compared with the last observation
for that agent; when it differs, a `TierChange` row is appended — from,
to, when — and the observation is updated. The row is a record of what the
computation said, written by the computation; it can no more be authored by
the agent than the tier can.

**A drop is told; a rise is not.** For every open conversation the agent is
party to, a message from `keys` is posted in the tenant's language saying
the agent's standing changed and what the badge now means. A rise is not
announced, because *this agent is now trusted* is the badge overclaiming
again, in a message.

**The event does not move the tier.** Nothing reads `TierChange` to decide
anything; the tier is still computed from evidence on every read.

## Consequences

One table and one message. The domain gains a function that says whether a
change is a drop and the sentence to send; the server gains the observe-
and-compare on the path that already computes the tier. A tenant is told
within one read of the change — which is the next time anyone looks at the
agent — rather than never.
