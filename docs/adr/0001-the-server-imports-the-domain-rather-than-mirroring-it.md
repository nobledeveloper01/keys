# ADR-0001 — The server imports the domain rather than mirroring it

## Status

Accepted — 2026-08-29.

## Context

Keys' central claim is `is_verified`. It is computed from seven conditions and
it has to mean exactly the same thing in four places: the renter's app, the
agent's app, a server-rendered listing page a search engine indexed, and the
server that decides it.

The previous project in this portfolio faced the same shape and answered it
differently. Its rules were TypeScript and its server was C#, so every shared
rule existed twice. Keeping the two honest took real machinery: a
`fixtures/parity.json` generated from the TypeScript, a C# mirror of every
engine, a parity suite comparing them case by case, and a `make fixtures` step
in the build that failed on staleness.

It worked. The parity suite caught genuine divergences, including an API
serialising timestamps two different ways in one response. But it was roughly a
third of the server effort, and every new rule cost a mirror.

The runtime was already settled: the backend spec says Node.js 22 and
TypeScript, chosen so the server could share `packages/domain` with mobile and
web. What was not settled was the framework, and with it whether we would take
the sharing seriously or reimplement anyway.

## Decision

**The NestJS server imports `packages/domain` directly. No mirror, no parity
fixtures, no second implementation of any rule.**

- `packages/domain` stays pure TypeScript with no platform imports, enforced by
  lint and by `scripts/boundary-check.sh`.
- The server depends on it as a workspace package, the same way the apps do.
- `fixtures/parity.json`, `scripts/emit-fixtures.ts` and the `fixtures-check`
  gate do not exist in this repository. There is nothing to hold in sync.

## Consequences

**A rule cannot drift, because there is one of it.** This is a stronger
guarantee than a passing parity suite: a suite proves two implementations agree
on the cases somebody thought to write down, and identity needs no cases at all.

**A third of the server work disappears**, and the cost of adding a rule drops
to writing it once.

**We lose the incidental benefits of the parity suite.** Comparing two
implementations across a serialised boundary caught wire-format bugs that
neither side would have caught alone — the timestamp spelling above was found
that way, not by a unit test. Nothing here replaces that automatically, so
contract tests against the OpenAPI schema take that job, and they must be
written deliberately rather than assumed.

**The domain package can no longer contain anything server-shaped.** It was
already forbidden from importing a platform; now the temptation is different —
to let a rule reach for the database because the server is right there. The
boundary lint does not catch intent, so this is a review responsibility.

**A domain change now redeploys the server.** With a mirror, the server moved
on its own schedule. Now a phrase added for a screen is a server dependency
bump. That is the correct coupling — they genuinely do share the rule — but it
is a real change to how releases are sequenced.

**Licensing follows from this.** `packages/domain` is Apache-2.0 while the rest
of the repository is BSL 1.1. Keys makes public claims about other people, and
the rules behind such a claim should be readable by the person it is made
about. Putting the rules in one auditable package is what makes that possible.
