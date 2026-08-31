# Keys — Product Requirements Document

| Field | Value |
|---|---|
| Product | Keys |
| Version | 1.0 |
| Framework | **React Native (New Architecture), TypeScript** |
| Platform | **Cross-platform: Android 8.0 (API 26)+, iOS 14+ — one codebase** |
| Companion | **Web (React) — landlord and agency console, and SEO-critical public listing pages. v1.0, not deferred** |

> **Note on the web target.** Unlike the other products in this portfolio, Keys needs a real web
> presence at launch: property search is a search-engine-discovered activity, and agencies work
> on desktops. The web app shares its domain package, API client and design tokens with the
> mobile app.

---

## 1. Goals

| # | Goal | Measure |
|---|---|---|
| G1 | Make a listing believable | > 95% of listings verified as real and available on random audit |
| G2 | Kill the wasted inspection | 60% reduction in self-reported wasted inspections vs. incumbent portals |
| G3 | Make scammers non-recyclable | 90% of reported scam numbers surfaced on lookup within 24 h |
| G4 | Retain past move-in | 50% of tenants still active 6 months after signing |
| G5 | Give honest agents an asset | 1,000 verified agents with visible records by month 12 |

**Business:** 50,000 renter installs and 1,500 verified agents in 18 months, Lagos first, then
Abuja and Port Harcourt. Revenue from agent subscriptions, landlord tenancy management, and
featured placement of **verified** listings only. **No commission on rent, no inspection-fee
share, no escrow.**

---

## 2. Personas

**P1 — Amaka, renter (primary).** 29, moving to Lekki for a new job. Budget ₦2.5m/year. Has paid
four inspection fees and seen two real properties. Now assumes every agent is lying.
**Needs:** to know a listing is real before spending anything; to see the property before
travelling; to check whether a number has been reported.
**Friction to avoid:** signup before value; fake-looking listings; anything that feels like the
portals she already distrusts.

**P2 — Emeka, agent (secondary).** 34, legitimate, manages 30 properties for eight landlords.
Loses business because prospects assume he is a scammer.
**Needs:** a verified badge, qualified leads, a portable reputation.
**Friction to avoid:** heavy per-listing work; slow verification; being treated as a suspect.

**P3 — Mrs. Bakare, landlord.** 47, owns four flats. Uses an agent but has no idea who is being
shown her property or what they were told.
**Needs:** visibility of her own listings, rent tracking, maintenance records.
**Friction to avoid:** anything requiring daily attention.

**P4 — Tunde, sitting tenant.** 31, two years into a tenancy. Not moving.
**Needs:** receipts, rent reminders, maintenance tickets that get resolved, and a condition
record so his deposit is not swallowed at exit.

---

## 3. Feature Scope

### 3.1 Agent Verification
| ID | Feature | Priority |
|---|---|---|
| F-101 | Agent registration: phone + OTP, profile, coverage area | P0 |
| F-102 | Government ID capture + **liveness face match** | P0 |
| F-103 | Verification tiers: Unverified → ID Verified → Business Verified → Established | P0 |
| F-104 | Business verification: CAC, office address, professional body membership where held | P0 |
| F-105 | Agent public profile: tier, listings, response rate, reports, tenure | P0 |
| F-106 | Re-verification cadence and expiry | P1 |
| F-107 | **Verification badge on every surface where the agent appears** | P0 |

### 3.2 Proof of Authority — the core differentiator
| ID | Feature | Priority |
|---|---|---|
| F-201 | A listing **MUST** carry proof the agent may let the property | P0 |
| F-202 | Accepted proofs: landlord authorisation letter, management agreement, landlord co-verification in-app | P0 |
| F-203 | Landlord co-verification: landlord confirms the agent by OTP link | P0 |
| F-204 | Proof status visible to renters: how authority was established | P0 |
| F-205 | Direct landlord listings, bypassing agents | P0 |
| F-206 | Authority expiry and revocation by the landlord | P1 |

### 3.3 Listing Integrity
| ID | Feature | Priority |
|---|---|---|
| F-301 | **Perceptual image hashing; duplicate detection across all listings, agents and cities** | P0 |
| F-302 | Reverse-image screening against known stock and prior listings | P0 |
| F-303 | **Automatic listing expiry (14 days) unless actively re-confirmed** | P0 |
| F-304 | Mandatory geotagged capture of at least one photograph on site | P0 |
| F-305 | **Video walkthrough required** for a listing to be marked Verified | P0 |
| F-306 | 360° tour support | P1 |
| F-307 | Listing metadata consistency checks (price vs. area, size vs. photographs) | P1 |
| F-308 | Renter reporting of a listing with a reason | P0 |
| F-309 | Human review queue for flagged listings | P0 |

### 3.4 Search & Discovery
| ID | Feature | Priority |
|---|---|---|
| F-401 | Search by area, price, bedrooms, type, and required amenities | P0 |
| F-402 | Map search with area boundaries | P0 |
| F-403 | **Filter: verified listings only — default ON** | P0 |
| F-404 | Total-cost calculator: rent + agency + agreement + caution, stated up front | P0 |
| F-405 | Saved searches with alerts | P1 |
| F-406 | Commute-time filter from a stated workplace | P1 |
| F-407 | Area guides: transport, power, water, market access | P2 |

### 3.5 The Scam Registry — the wedge
| ID | Feature | Priority |
|---|---|---|
| F-501 | **Public lookup by phone number or agent name — no account required** | P0 |
| F-502 | Report a scam with evidence: screenshots, receipts, description | P0 |
| F-503 | **Human review before any report is published** | P0 |
| F-504 | Right of reply for the reported party | P0 |
| F-505 | Reports expire and can be resolved | P0 |
| F-506 | Warning surfaced automatically when a listing's contact matches a reported number | P0 |
| F-507 | Aggregate scam-pattern education content | P1 |

### 3.6 Inspection & Application
| ID | Feature | Priority |
|---|---|---|
| F-601 | Request an inspection with proposed times | P0 |
| F-602 | **In-app inspection-fee policy declared per listing, up front** | P0 |
| F-603 | Inspection outcome recording — did the property match? | P0 |
| F-604 | Application submission with the renter's profile | P1 |
| F-605 | Application status tracking | P1 |

### 3.7 Tenancy Management — the retention engine
| ID | Feature | Priority |
|---|---|---|
| F-701 | Digital tenancy agreement from a reviewed template, e-signed | P0 |
| F-702 | Rent schedule with reminders at 30, 14 and 7 days | P0 |
| F-703 | Rent payment **recording** and receipts — **not payment processing** | P0 |
| F-704 | Maintenance tickets with photographs, status and history | P0 |
| F-705 | **Move-in and move-out condition record**, photographic, timestamped, both parties acknowledging | P0 |
| F-706 | Document vault: agreement, receipts, correspondence | P0 |
| F-707 | Renewal reminders and rent-review record | P1 |
| F-708 | Landlord portfolio view across properties | P1 |

### 3.8 Platform
| ID | Feature | Priority |
|---|---|---|
| F-801 | Browse and search with **no account** | P0 |
| F-802 | Account required only to contact, apply, or report | P0 |
| F-803 | In-app messaging; contact details revealed only on mutual engagement | P0 |
| F-804 | Aggressive media optimisation; video adaptive to connection | P0 |
| F-805 | Offline: saved listings and tenancy documents available without network | P0 |
| F-806 | Web parity for search, listing pages and the console | P0 |

---

## 4. Key Journeys

**J1 — Check a number (the wedge, target: 15 seconds, no account).**
Open Keys → **Check an agent** → paste the phone number → *"This number has been reported 3
times for collecting inspection fees for properties that don't exist. Most recent: 4 days ago."*
No signup. No listing needed. Immediately useful to someone who found the property on Facebook.

**J2 — Find a real place.**
Search Lekki, ₦2–3m, 2 bed → **Verified only** is on by default → each result shows the agent's
tier, when availability was last confirmed, and a video walkthrough → Amaka watches three
walkthroughs at home → requests one inspection → the fee policy was stated before she asked →
the property matches the video.

**J3 — Agent lists a property.**
Emeka creates a listing → uploads authority (or triggers landlord co-verification by OTP) →
captures photographs **on site, geotagged** → records a walkthrough → the system checks
perceptual hashes against every existing listing → published as Verified → **at 14 days he is
asked to confirm it is still available, or it expires.**

**J4 — Tenancy.**
Amaka signs digitally. Rent schedule created. Move-in condition record captured by both parties.
Twenty months later the shower breaks: she raises a ticket with photographs; the landlord sees it,
assigns it, and it is recorded as resolved. At exit, the move-out record is compared to move-in
and the deposit conversation takes four minutes instead of four weeks.

---

## 5. Success Metrics

**Trust:** > 95% of listings real and available on random audit; < 2% of inspections reported as
mismatched; 90% of reported scam numbers live on lookup within 24 h.
**Activation:** scam lookup used by 40% of new users in session 1; account creation deferred past
first value for > 70%.
**Marketplace:** 1,000 verified agents by month 12; median listing age at let < 21 days; > 80% of
listings carrying a walkthrough.
**Retention:** 50% of tenants active at 6 months; ≥ 3 maintenance tickets per tenancy per year.
**Technical:** search results < 1.5 s; walkthrough start < 3 s on 3G; app < 40 MB; crash-free
> 99.5% both platforms.

---

## 6. Constraints & Non-Negotiables

- **Keys will have fewer listings than the incumbents, permanently.** Verification is a filter
  and filters reduce volume. The product must never be tempted to relax verification to close a
  volume gap — that would destroy the only thing it sells.
- **Keys never holds money.** No escrow, no rent collection, no deposit holding. Payment is direct.
- **Keys does not verify title.** It verifies **authority to let**. The distinction is stated
  plainly to every user, because overclaiming here has legal consequences.
- **Keys is not a guarantor.** Verification reduces risk; it does not eliminate it, and the
  product must not imply protection it cannot deliver.
- **Scam reports are defamation-sensitive.** Every published report is human-reviewed, evidence-
  backed, subject to right of reply, and expiring. This is a legal requirement as much as an
  ethical one.
- **Video on Nigerian mobile data must be cheap.** Adaptive bitrate, aggressive compression, and
  an explicit data-saver path are P0.

---

## 7. Cross-Platform Requirements

| Capability | Android | iOS | Web | Handling |
|---|---|---|---|---|
| Search & listing pages | Full | Full | **Full, SSR for SEO** | Shared domain package and API client; web is not an afterthought |
| ID + liveness | Vendor SDK | Vendor SDK | Redirect to mobile | Verification is mobile-only; web prompts a hand-off |
| **Geotagged on-site capture** | Camera + location at capture | Camera + location at capture | **Not possible — blocked** | Listing photographs **must** originate from a mobile capture. Web upload alone cannot produce a Verified listing |
| Video capture | VisionCamera | VisionCamera | Upload only | Walkthroughs are captured in-app on mobile |
| Video playback | ExoPlayer via `react-native-video` | AVPlayer | HLS | Adaptive bitrate on all three |
| Perceptual hashing | Client pre-hash + server authoritative | Same | Server only | Client hashing gives instant feedback; **the server decides** |
| E-signature | In-app canvas | In-app canvas | Canvas | Same signature payload format |
| Push | FCM | APNs via FCM | Web push | Shared notification service |
| Offline saved listings | SQLite | SQLite | IndexedDB | Shared repository interface, three adapters |

**The geotagged-capture requirement is deliberately platform-limiting**, and it is the point: a
Verified listing requires that someone stood at the property with a phone. That cannot be
satisfied from a desktop, and making it satisfiable would remove the guarantee.

---

## 8. Monetisation

- **Renters — free.** Always. Search, lookup, reporting, tenancy tools.
- **Agent — ₦7,500/month.** Unlimited verified listings, verified badge, lead management,
  analytics, priority review. Free tier: 2 active listings.
- **Landlord tenancy management — ₦2,000 per property per month.** Agreements, rent schedule,
  receipts, maintenance, condition records, portfolio view.
- **Featured placement — ₦3,000 per listing per week.** **Verified listings only.** An unverified
  listing can never buy visibility, at any price. This is a hard rule: the moment money can buy
  prominence without verification, the product is a portal again.

**Never:** commission on rent, inspection-fee share, escrow, or lending.
