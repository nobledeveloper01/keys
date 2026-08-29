# Keys — Journal

What we did, and what surprised us. One entry per working session, newest
first. The surprises are the point: a journal of what went to plan is a
changelog with worse formatting.

---

## 2026-08-29 — Phase 1, and three guards that could not fail

**Did.** Built the scam registry: publication policy in the domain as an
allow-list, three doors onto one store, the reviewer console, right of reply by
a texted capability, retention with a deletion date on the row. The web wedge
as server-rendered pages — check a number, report one, answer one, no account.
The API client generated from the controllers, with a gate that fails when it
drifts. Phase 1's software gate is green; two human gates and the SMS provider
are open.

### What surprised us

**The exit gate passed while the thing it guards was broken.** I broke it four
ways on purpose. Removing `@UseGuards` from the review console: caught. Leaking
`reporterId`: caught. Adding a debug route that dumps the store: caught, which
is the one that proves the route enumeration is doing work rather than testing
a list I wrote. Dropping `publishedAt !== null` from the store's public read:
**passed.** Every route test stayed green, because the controller filters a
second time through the domain. The filter whose own comment calls it "the one
that matters" was held by nothing, and it is the last line standing the first
time somebody changes that controller. It has its own test now, with no
controller in the way.

**Three of the four guards ported in phase 0 could not fail.** `wired-check`
printed "everything exported is wired to something" while `NOT_UPHELD_RETENTION_MONTHS`
had no caller anywhere — its rules still named Backhaul's C# repository
directories, so it was scanning nothing and saying so in the language of
success. `untranslated-check` was listed in `make gates` and exited zero
unconditionally, and resolved its scan path against the working directory, so
from any folder but the root it examined no files and printed a clean line.
Both fixed, both now fail when they examine nothing, both proven by breaking
them.

That is the same defect the guards exist to catch, one level up: written,
plausible, connected to nothing. Porting a guard between repositories is
writing a new guard, and it passing on arrival is evidence of nothing. Written
down as [ADR 0004](adr/0004-a-gate-that-cannot-fail-is-not-a-gate.md).

**Generating the client caught a lie in the document.** `@ApiOkResponse` on a
POST described a `200` the server never sends; Nest answers `201`. A
hand-written client would have carried that for a year.

**And running the actual product found what no unit test could.** The web
report form collects no evidence, `review()` refuses to uphold without
evidence, and file upload belongs to phase 3. Two correct decisions with no
path between them, and every report reachable from the public form permanently
unupholdable. Fifth time this shape has appeared across these two projects.
The bridge is a reviewer recording evidence they obtained out of band, keyed
`reviewer-attested:` so an audit can see exactly what it is, and phase 3
replaces it.

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

