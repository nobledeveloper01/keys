# Keys

**Verified rental listings and tenancy management for Nigerian cities.**

Finding a place to rent in Lagos, Abuja or Port Harcourt costs money before it costs rent. You see
a listing, you call, you pay an inspection fee — and then the property does not exist, or was let
three months ago, or the person showing it has no authority to let it. You have spent ₦10,000 and
half a day. You repeat this ten times.

The inspection fee is not a cost of finding a house. For a meaningful number of operators, **it is
the entire business model** — because the fee is collected before the property is seen.

Keys attacks one thing first — *the listing is real* — and then follows the tenant into the
tenancy.

See [`docs/00-PRODUCT-STATEMENT.md`](docs/00-PRODUCT-STATEMENT.md) for the full analysis.

---

## Status

**Phase 0 of 8. Building.** `PHASE` holds the number and
[`docs/ROADMAP.md`](docs/ROADMAP.md) holds the gates.

Phase 0 is the foundation: one rules package imported by the React Native app,
the web app and the NestJS server, with the boundary rule proved to fire.

| | |
|---|---|
| Mobile | React Native 0.87, New Architecture, TypeScript strict |
| Web | React with SSR — listing pages are a business requirement, not a roadmap item |
| Server | **NestJS on Node 22**, importing the same rules the phone runs |
| Data | PostgreSQL with PostGIS |
| Rules | `packages/domain`, pure TypeScript, four consumers, [Apache-2.0](packages/domain/LICENSE) |

**There is no parity suite here, and that is the point.** The last project in
this portfolio had a C# server mirroring a TypeScript domain, held together by
generated fixtures. This one imports the domain, so a rule cannot drift because
there is only one of it. See
[ADR-0001](docs/adr/0001-the-server-imports-the-domain-rather-than-mirroring-it.md).

## The insight

**The scarce commodity is not listings. It is the belief that a listing is real.**

Nigerian property portals have enormous inventory and near-zero trust. Adding more listings adds
nothing. The whole opportunity is making a *smaller, verified* inventory credible — and the honest
consequence is that Keys launches with far fewer listings than the incumbents and must be
comfortable with that.

The mechanism is inverting the incentive on inspection fees. Keys takes no cut of them, so a
listing that generates fees without ever producing a let is worthless to Keys and profitable to a
portal.

## The wedge

**A free, public, no-account scam registry.** Paste a phone number and find out whether it has
been reported. That is useful on day one to someone who found the property on Facebook, with zero
listings and zero agents on the platform.

It also solves the hardest problem in a two-sided property marketplace: agents come to Keys to
*defend a clean record*, so onboarding is partly self-driven rather than entirely sales-driven.

## Does it need a backend?

**Yes — the most backend-dependent in the portfolio.** Everything Keys sells is a *judgement about
someone else's claim*: is this listing verified, is this photograph already in use elsewhere, did
this capture happen at the property, may this agent let it, should this scam report be public.
None of that can be decided anywhere a client can reach.

Unusually, a **human-review console is a first-class product surface**, and its throughput is a
hard constraint on how fast the company can grow. Keys expands city by city at the pace the review
queue can sustain.

## How a listing is verified

Four independent mechanisms, so defeating one does not defeat the system:

1. **Geotagged on-device capture** — at least one photo taken in-app, within 200 m of the stated
   address, signed on-device and verified server-side. EXIF is not trusted; it is trivially forged.
2. **Perceptual hashing** — every image compared against every image ever uploaded, across agents,
   cities and time. Recycled photographs are the signature of a fake listing.
3. **Proof of authority** — the landlord confirms the agent by OTP, or a reviewed document does.
4. **Forced 14-day expiry** — confirmed by a deliberate per-listing action. There is deliberately
   **no bulk-confirm**: the friction is the feature.

## What it does not claim

Keys verifies **authority to let, not title or ownership**. It is not a guarantor, and it handles
no money — no escrow, no rent collection, no deposit holding. The schema itself has no transaction
columns.

## Platforms

Android 8.0+, iOS 14+, **and web at v1.0** — property search is a search-engine-discovered
activity, so server-rendered listing pages are a business requirement, not a roadmap item.

Geotagged capture is deliberately impossible on web. That limitation *is* the guarantee: a
verified listing requires that a person physically stood at the property.


---

## Licensing

Two licences, because the two halves have opposite jobs.

**The application is under the [Business Source License 1.1](LICENSE).** You may
run it in production to list, verify, let and manage properties belonging to you
or your clients. You may not offer Keys itself to third parties as a hosted
listing, verification or tenancy service. On **2030-08-29** it converts to
Apache-2.0 automatically.

**The rules are Apache-2.0**: [`packages/domain`](packages/domain/).

That split is not symmetry. Keys makes public claims about other people — that a
listing is verified, that a phone number was reported — and **a claim about
somebody, decided by rules they may not read, is a claim with no standing.** The
verification logic and the report policy live in one auditable package so that
the person a claim is made about can check it.
