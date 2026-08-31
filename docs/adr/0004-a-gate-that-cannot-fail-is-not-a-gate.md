# 4. A gate that cannot fail is not a gate

Date: 2026-08-29

## Status

Accepted

## Context

Four of this repository's guards were ported from Backhaul in phase 0, and in
phase 1 three of them turned out to be reporting clean over code they were not
examining:

- **`wired-check`** printed "everything exported is wired to something" while
  `NOT_UPHELD_RETENTION_MONTHS` had no caller anywhere. Its rules still named
  Backhaul's C# repository directories, which do not exist here, so it scanned
  nothing and said so in the language of success.
- **`untranslated-check`** was listed in `make gates` and exited zero
  unconditionally. It also resolved its scan path relative to the working
  directory, so running it from anywhere but the repository root scanned no
  files and printed a clean line.
- **`boundary-check`** named one specific domain file that had since been
  deleted (fixed in phase 0 when the same defect was found).

Every one of these looked green in CI. None of them could have failed.

This is not a porting problem. It is the same defect the guards exist to catch,
one level up: code that is written, plausible, and connected to nothing.

## Decision

**Every gate asserts that it examined something, and fails when it did not.**

- `wired-check` has `scanned_nothing()`, which fails the build when a scan root
  holds no source files. It runs before every other rule.
- `untranslated-check` exits 1 when it finds no `.tsx` files at all, and its
  path is anchored to the script's own location rather than to the caller's
  working directory. It now also exits 1 on findings, which it never did.
- The adversarial route test asserts a minimum route count before asserting
  anything about those routes, so a Nest upgrade that changes the router shape
  fails loudly instead of passing vacuously.
- The Phase 0 domain-sharing test carries a structural scanner for the same
  reason, after the first version of that scanner went out of phase over the
  source and reported nothing while looking like a pass.

**And every gate is proven by breaking it.** Before a gate counts as done,
whatever it guards is deliberately broken, the gate is watched to fail, and
the break is reverted. Phase 1's gates were proven against: a removed
`@UseGuards`, a leaked reporter id, a dropped `publishedAt` filter, a forgotten
debug route dumping the store, an injected dead export, a moved scan root, and
a hardcoded English string in a screen.

The dropped-`publishedAt` break is the one worth recording. **It passed.** The
route tests stayed green because the controller filters a second time through
the domain, so the store's filter — the one its own comment calls "the one that
matters" — was held by nothing. That is now `the-public-read-cannot-see-unpublished.test.ts`,
which holds it directly with no controller in the way.

## Consequences

Porting a guard between repositories is now understood as writing a new guard.
Its paths, its rules and its vocabulary all belong to the codebase it came
from, and the fact that it passes on arrival is evidence of nothing.

`wired-check`'s domain rule is deliberately the narrow one — it asks only
whether a name appears anywhere but its own definition. An earlier draft walked
the call graph and refused to count same-file callers, and it named the four
live vocabulary tables as dead. It therefore misses two dead helpers that call
each other, and that is the accepted price of never crying wolf.

## Postscript, 2026-08-31 — the remedy had the defect

This ADR's remedy was `scanned_nothing()`: a liveness check that fails when a
root a rule reads has stopped existing. It was added to `wired-check.py` after
the fourth and fifth instances.

A sixth was found on 2026-08-31, in `wired-check.py`, by hand. Rule 2 pointed
at `apps/mobile/src/api/client.ts` — a path from the previous project — and had
returned an empty list on every run for a whole phase. `scanned_nothing()`
covered the app, the server and the domain, and not the API package, which is
the root the broken rule read.

**A liveness check that does not enumerate every root every rule uses is itself
a rule that cannot fail.** The check now derives its roots from the same
constants the rules do. That is the specific correction; the general one is
that "the guard is guarded" is a claim to be tested rather than a design to be
admired, and the way to test it is to move a path and watch the build break.

## Second postscript, 2026-08-31 — a seventh, in the same file again

`wired-check.py`'s domain rule matched `export function` and `export const`. It
did not match `export class`.

`packages/domain/src/hashing.ts` — the perceptual hash, the BK-tree, the
duplicate policy, written against an adversarial corpus of nine attacks — was
called by nothing at all, and the gate reported clean on every run because
`HashIndex` is a class. The module was found by grepping for its own name, not
by any guard.

Note what the first postscript's fix did *not* cover. `scanned_nothing()` asks
whether each root still exists; this root existed and was full of code. The rule
read it and understood none of what was in it. **A liveness check answers "is
this rule looking at anything"; it cannot answer "is this rule seeing what is
there."** The second question needs the guard to be broken on purpose in the
shape it claims to catch — which is the practice this repository already had for
gates and had never applied to the gate-checker itself.
