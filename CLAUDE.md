# Keys

Verified rental listings and tenancy management for Nigerian cities.

Read `docs/00-PRODUCT-STATEMENT.md` for why this exists, `docs/ROADMAP.md` for
what phase we are in and what its exit gate is, and `docs/adr/` for the
decisions that are settled. `PHASE` holds the current phase number.

The one sentence that decides most arguments:

> **The scarce commodity is not listings. It is the belief that a listing is
> real.**

Adding inventory adds nothing. The whole opportunity is making a *smaller,
verified* inventory credible, and the honest consequence is that Keys launches
with far fewer listings than the incumbents and must be comfortable with that.
**Verification is never relaxed to close a volume gap.**

## The things that are never traded

1. **The domain imports nothing from the platform.** No React, no React
   Native, no DOM, no database, no clock, no randomness. Enforced by lint and
   by `scripts/boundary-check.sh`, which proves the rule still fires.
2. **One implementation of every shared rule.** The server imports
   `packages/domain` rather than mirroring it. `is_verified` cannot mean two
   things on two surfaces because there is only one of it.
3. **No unreviewed report is publicly retrievable, by any query path.** Not by
   the intended endpoint, not by search, not by an id somebody guessed. This
   is a release blocker and a legal one.
4. **Keys verifies authority to let, not title or ownership.** It is not a
   guarantor and it handles no money. The schema has no transaction columns,
   and no copy may imply protection we do not provide.
5. **A verification tier is only worth the evidence behind it.** Anything an
   agent can assert about themselves proves nothing. A document counts when a
   human has reviewed it.
6. **Unknown is a first-class answer.** A listing whose status cannot be
   computed is `unknown`, never optimistically `verified`.
7. **Nothing a client sends decides a verification outcome.** It is computed
   server-side from evidence the claimant cannot write.

## Working on this repo

- `make ci` is the gate. `make gates` runs the blocking ones alone.
- **Prove a guard fires before trusting it.** Break it on purpose, watch it
  fail, put it back. Two guards on the last project were reporting clean over
  real defects, and only this found them.
- **Node 22.18 or newer.** The domain package runs its tests through Node's own
  type stripping — no build step, no loader, no jest. Source imports carry the
  `.ts` extension for that reason.
- ADRs live in `docs/adr/`. **Write one for any non-obvious decision, before
  the code that depends on it.**
- **`docs/JOURNAL.md` every working session.** What we did, and what surprised
  us. The surprises are the point.

## Definition of done

- [ ] Acceptance criteria met and demonstrated on a device
- [ ] Verified-status rules property-tested if the listing path was touched
- [ ] Works on mobile and web where the FRD requires both
- [ ] Verified on physical Android **and** physical iOS, including a low-end
      Transsion handset
- [ ] Light and dark authored on both surfaces
- [ ] 200% text scaling without truncation — check it, do not assume it
- [ ] Screen-reader labelled; colour never the sole carrier of meaning
- [ ] Every error path has a forward path — no dead ends
- [ ] **Copy reviewed against the overclaiming guidelines** — does this imply
      protection we do not provide?
- [ ] ADR written for any non-obvious decision
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] `make ci` green
