# Keys — Journal

What we did, and what surprised us. One entry per working session, newest
first. The surprises are the point: a journal of what went to plan is a
changelog with worse formatting.

---

## 2026-08-29 — Phase 0, and a guard that reported clean over a copy

**Did.** Started Keys. Monorepo with mobile, web, server and two shared
packages; NestJS server importing `@keys/domain` rather than mirroring it;
design system, fourteen components, the splash and the data layer ported from
the previous project; every gate wired and `make ci` green.

### What surprised us

**The gates caught my own over-porting within the first hour.** I copied
`native/permissions.ts` and `state/ids.ts` across because both are obviously
going to be needed, and `wired-check` reported them as imported by nothing.
They were. The right answer was to delete them and port them in the phase that
uses them, because carrying code ahead of its use and exempting it is exactly
how the previous project accumulated ten written excuses, one of which turned
out to be false.

**The Phase 0 gate test passed while the gate was being violated.** The
condition is "one domain package imported by the server, not copied". The first
test compared a response against the imported module, which proves the import
resolves and nothing more. Replacing `say('en', 'verified')` in the controller
with the literal `'Verified'` left it green, because the copy and the module
agreed at that moment. A copy is not wrong for being different today; it is
wrong because nothing stops it becoming different.

I only found that because I broke it on purpose. The structural test that
actually catches it was written afterwards, and would not exist otherwise.

**Then the structural test was broken too, in a more interesting way.** It
scanned server source for string literals matching a phrase, using a regex that
matched quoted runs of three characters or more. `'ok'` is two, so it was
skipped — and skipping one quote puts the whole scan out of phase, pairing the
closing quote of one string with the opening of the next. It reported no
offenders and looked exactly like a passing check. Match every string, then
filter by length; never the other way round.

Two guards, two false greens, both found by feeding them the thing they were
written to catch. That is now three projects running where the same practice
has found a bug in a guard rather than in the code.

**No parity suite here, and the absence is the point.** ADR-0001. The previous
server was C# and every shared rule existed twice; a third of the server work
was keeping the copies honest. `fixtures/parity.json`, `emit-fixtures.ts` and
the `fixtures-check` gate do not exist in this repository, because there is
nothing to hold in sync.

What we give up is real and worth naming: comparing two implementations across
a serialised boundary caught wire-format bugs neither side would have caught
alone. Contract tests against the OpenAPI schema take that job in phase 1, and
they have to be written deliberately rather than assumed.

---

