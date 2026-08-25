# Keys — Product Statement

**Verified rental listings and tenancy management for Nigerian cities.**

---

## The Problem

Finding a place to rent in Lagos, Abuja or Port Harcourt costs money before it costs rent.

The standard experience: you see a listing. You call the number. The "agent" asks for an
**inspection fee** — ₦5,000 to ₦20,000 — before they will show you the property. You pay. You
travel across the city. And then one of several things happens:

- The property does not exist. The photographs were taken from another listing, or another city,
  or a stock library.
- The property exists but was let three months ago. The listing was never removed because
  removing it would stop generating inspection fees.
- The property exists and is available, but the person showing it has no relationship with the
  landlord and no authority to let it.
- The property is real and available, but it is nothing like the photographs — different size,
  different condition, different street.

You have spent ₦10,000 and half a day. You repeat this five, ten, fifteen times.

**The inspection fee is not a cost of finding a house. For a meaningful number of operators, it
is the entire business model.** There is no incentive to show you a real property, because the
fee is collected before the property is seen.

### And then the fees stack up
When you finally find somewhere, the entry cost is brutal: one to two years' rent up front, plus
agency fee, plus agreement fee, plus caution/legal fee — commonly 20–30% on top of the rent
itself, paid to people whose contribution was showing you a door.

### And then the tenancy itself is undocumented
Rent due dates tracked in a notebook. Maintenance requests over WhatsApp, unrecorded and
unresolved. Deposits disputed at exit with no condition record. No receipts. Disputes settled
by whoever argues hardest.

---

## Why Existing Solutions Do Not Work

**Property portals** are classifieds. They accept listings from anyone, verify almost nothing,
and their revenue depends on listing volume — which is a direct incentive not to remove stale or
fake listings. The inspection-fee scam runs on them, not despite them.

**Facebook and WhatsApp groups** are worse: no verification at all, no listing lifecycle, and
no recourse.

**Estate agencies** with real reputations exist and mostly work, but they serve the top of the
market and their inventory is a fraction of what is available.

**International PropTech models** assume verifiable title registries, credit-referencing
infrastructure, deposit-protection schemes and enforceable standard leases. None of that
infrastructure is reliably available here, so a straight port does not function.

---

## The Product

Keys attacks one thing first — **the listing is real** — and then follows the tenant into the
tenancy.

1. **Verified agents only.** Every listing agent completes identity verification with a liveness
   check. Their name, verification tier and history attach to every listing they post.
2. **Proof of authority.** A listing requires evidence that this agent may actually let this
   property — a landlord authorisation, a management agreement, or landlord co-verification.
3. **Listings expire.** A listing dies automatically unless the agent actively re-confirms
   availability on a short cycle. Stale inventory is removed by default rather than by request.
4. **Duplicate and theft detection.** Perceptual image hashing catches photographs recycled
   across listings, agents and cities — the signature of a fake listing.
5. **Inspect before you pay.** Every listing carries a video walkthrough, and where available a
   360° tour. You see the property before you travel and before you pay anybody anything.
6. **A scam registry.** Reports are searchable by agent name and phone number, so a scammer
   cannot simply create a new listing and start again.
7. **Then the tenancy.** Digital agreement, rent reminders, receipts, maintenance tickets with
   photographs and status, and a move-in/move-out condition record that ends deposit disputes.

---

## The Insight

**The scarce commodity is not listings. It is the belief that a listing is real.**

Nigerian property portals have enormous inventory and near-zero trust. Adding more listings adds
nothing. The entire product opportunity is in making a *smaller, verified* inventory
credible — and the honest consequence is that Keys will launch with far fewer listings than the
incumbents and must be comfortable with that.

The mechanism that makes it work is **inverting the incentive on inspection fees.** Keys does not
take a cut of them. A listing that generates inspection fees without ever producing a let is
worthless to Keys and profitable to a portal. That misalignment is the wedge.

---

## The Wedge

**The scam registry and agent lookup — free, open, and useful before Keys has a single listing.**

Anyone can search a phone number or an agent's name and see whether they have been reported.
That is valuable on day one, to people who found the property somewhere else entirely, with zero
inventory on the platform.

It also does something structurally clever: it brings agents to Keys to *defend their
reputation*. An agent with a clean record wants that record visible. Agent onboarding — normally
the hardest part of a two-sided property marketplace — becomes partly self-driven.

---

## Target User

**Primary — the urban renter, 25–40.** Moving for work or upgrading. Has been scammed at least
once or knows someone who has. Smartphone-first. Motivated by not wasting money and time on
properties that do not exist.

**Secondary — the honest agent.** Most agents are legitimate and are actively harmed by the
scammers, because the scammers have made every prospective tenant suspicious of everyone.
Motivated by a verified badge, better-qualified leads, and a reputation that is portable and
visible.

**Tertiary — the small landlord.** Owns one to five properties. Currently hands everything to an
agent and hopes. Motivated by seeing who is actually being shown their property, and by rent
tracking that is not a notebook.

**Quaternary — the sitting tenant.** Already renting, not moving. Uses Keys for rent records,
receipts, maintenance tickets and the condition record. This is what makes Keys a retained
product rather than one deleted the week after moving in.

---

## Why Now

- **Video-first property browsing is now expected**, and mobile data is cheap enough for
  walkthroughs to be practical.
- **Identity verification is a commodity.** Liveness and ID matching can be bought per check
  rather than built.
- **Perceptual hashing at scale is cheap**, which makes recycled-photograph detection —
  the single strongest fake-listing signal — economically trivial.
- **Rental fraud has become a mainstream topic of complaint**, which means the problem is
  legible enough that a product framed around trust will be understood immediately.

---

## Explicitly Not

- **Not a title-verification or legal service.** Keys verifies **authority to let**, not
  ownership or title. C of O verification is a different, legally fraught product and Keys does
  not claim it.
- **Not an escrow, deposit-holding or rent-collection business.** Payment is direct between
  tenant and landlord or agent. Holding rent or deposits makes this a regulated financial
  business and imports enormous liability.
- **Not a lender.** No rent financing, no deposit loans. That is fintech.
- **Not an agent-elimination play.** Good agents are useful. Keys makes their record visible and
  their leads better qualified; it does not try to remove them.
- **Not a guarantor.** Keys verifies and records. It does not indemnify anyone against a bad
  outcome, and it says so plainly rather than implying protection it cannot deliver.
