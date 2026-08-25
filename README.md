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

Specified, not yet built. Fourth in the portfolio build order.

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
