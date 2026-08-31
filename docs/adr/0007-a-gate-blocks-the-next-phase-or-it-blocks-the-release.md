# 7. A gate blocks the next phase, or it blocks the release

Date: 2026-08-31

## Status

Accepted

## Context

Phase 1 declared four exit gates. One is green, one is blocked on an SMS
provider the roadmap schedules for **phase 3**, and two need a person doing a
job that does not exist yet — a reviewer working real reports, and a Nigerian
lawyer reading the report policy.

Read literally, phase 1 cannot end until phase 3 has happened. That is not a
scheduling problem to be argued away; it is a category error in how the gates
were written. "Exit gate" was doing two different jobs:

- *This must be true before the next phase is safe to build on.* If the registry
  can leak an unreviewed report, nothing built on top of it can be trusted, and
  every week of building on it makes the fix more expensive.
- *This must be true before anybody outside sees it.* If no lawyer has read the
  report policy, that is a reason not to launch. It is not a reason to stop
  writing the agent-verification code.

Collapsing the two means either lying about the first to make progress, or
freezing on the second. The previous project in this portfolio hit the same wall
and split its gates three ways; this is the same lesson arriving here.

## Decision

**Every gate is labelled with what it blocks, and only one kind blocks the next
phase.**

- **Phase gates** — the next phase may not begin until these are green. They are
  properties of what has been built, testable now, and failing one means the
  foundation is wrong.
- **Release gates** — v1.0 does not ship until these are green. They may depend
  on work scheduled later, on a person, or on an outside party. They are tracked
  in one list so that "we will do it before launch" is a commitment with a
  visible ledger rather than a sentiment.

Phase 1's gate 1 is a phase gate and it is green. Its gates 2, 3 and 4 are
release gates.

**The ledger is a document, not a memory.** `docs/RELEASE-GATES.md` lists every
open release gate, what it is waiting on, and which phase is expected to clear
it. `scripts/doc-check.sh` fails when a roadmap phase declares a release gate
that is not in the ledger.

## Consequences

Phase 1 is complete as a phase and incomplete as a release, and both are now
sayable at once. That is the honest description of where the product is, and it
was not expressible before.

**The risk this creates is real and worth naming.** A release-gate list is a
place for uncomfortable work to accumulate quietly. Three of the four items on
it today are things nobody can do at a keyboard — they need a reviewer, a
lawyer, and an SMS contract. The mitigation is that the list is short, dated,
and printed in the README rather than filed somewhere; if it grows past what one
screen holds, that is the signal that the product is being built past the point
anybody can honestly ship it.
