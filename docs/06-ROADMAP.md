# Keys — Roadmap & Delivery Plan

---

## 1. MVP Definition

**The MVP is the scam registry.**

Not the marketplace. A free, public, no-account lookup where anyone can paste a phone number and
find out whether it has been reported. It is useful on day one to someone who found a property on
Facebook, with zero listings on Keys and zero agents onboarded.

It also solves the hardest problem in a two-sided property marketplace: **agent acquisition**.
Agents come to Keys to defend and display a clean record, which means onboarding is partly
self-driven rather than entirely sales-driven.

### In the MVP
- **Scam registry: public lookup, reporting, human review, right of reply, expiry, resolution**
- Agent verification with ID and liveness, tiered
- Proof of authority, including landlord co-verification by OTP
- Listing creation with **geotagged on-site capture** and **video walkthrough**
- **Perceptual hashing and duplicate detection**
- **14-day forced expiry with per-listing confirmation**
- Search with **Verified-only defaulting on**, map search, total-cost calculator
- Listing pages with the evidence panel
- In-app messaging with deferred contact exchange
- Inspection requests with declared fee policy, and outcome recording
- **Web: SSR listing pages and search (SEO-critical), plus the agency console**
- Human-review console
- Android, iOS and Web

### In v1.1 — tenancy
- Digital agreement and e-signature
- Rent schedule, reminders, recorded payments, receipts
- Maintenance tickets
- **Move-in / move-out condition records**
- Landlord portfolio

### Not in v1.0 or v1.1
- 360° tours → v1.2
- Saved searches and alerts → v1.1
- Commute-time filter → v1.2
- Area guides → v1.2
- Application and screening flow → v1.2

**Tenancy is v1.1, not v1.0**, even though it is the retention engine. A renter cannot use it
until they have signed a lease, and they cannot sign a lease until the marketplace works. Building
it first would be building for users who cannot yet exist.

---

## 2. Phases

### Phase 0 — Foundation (Weeks 1–3)
Monorepo with mobile, web and shared packages. Domain boundary lint. RN New Architecture. Next.js
with SSR. Design tokens across both UI targets. Postgres with PostGIS. CI building mobile
artefacts and deploying web previews.

*Exit:* one domain package consumed by mobile, web and server, proven in CI.

### Phase 1 — The Scam Registry (Weeks 4–8) — the wedge
Public lookup with no account, reporting with evidence, **the human-review console**, right of
reply with the 7-day window, publication gating, expiry and resolution.

*Exit gates:*
1. **No unreviewed report is publicly retrievable by any query path.** Release blocker.
2. Right-of-reply flow works end to end, including for reported parties who have no Keys account.
3. Review console throughput measured — this number sets the growth pace.

**Launched publicly at the end of this phase**, standalone, with no listings at all.

### Phase 2 — Agent Verification & Authority (Weeks 9–13)
Liveness and ID TurboModule, tiers, agent profiles, authority upload and review, **landlord
co-verification by OTP**, revocation cascade.

*Exit:* tier gates enforced server-side and unbypassable from a modified client; revocation
unpublishes dependent listings atomically.

### Phase 3 — Listing Integrity (Weeks 14–19) — **the technical core**
Geotagged in-app capture with device signing, mock-location detection, video capture and
transcoding, perceptual hashing with BK-tree indexing, the duplicate-match pipeline, the
`is_verified` computation, forced expiry with per-listing confirmation.

*Exit gates — all release blockers:*
1. **Property-based tests prove no input combination yields Verified unless all seven conditions
   hold.**
2. **Adversarial hashing corpus** (resize, recompress, crop, watermark, flip, colour-shift) meets
   the detection threshold.
3. **An injected upload that did not pass through in-app capture is rejected** by signature
   verification.

### Phase 4 — Search & Discovery (Weeks 20–23)
Postgres FTS + PostGIS search, filters with Verified defaulting on, map search, ranking in the
domain package, total-cost calculation, listing pages with the evidence panel, **SSR and
structured data on web**.

*Exit:* sub-1.5 s results; rendered HTML asserted to contain listing content; structured data
validating.

### Phase 5 — Marketplace Loop (Weeks 24–27)
Messaging with deferred contact exchange, inspection requests with fee policy, outcome recording
with the automatic Verified suspension on `didn't exist`, listing reports, featured placement
(Verified-only, capped).

*Exit:* end-to-end from search to inspection outcome, on all three surfaces.

### Phase 6 — Launch Hardening (Weeks 28–32)
Media pipeline budgets enforced, data-saver, offline saved listings, device matrix, accessibility
audit on mobile and web, legal review of agreement templates and report policy, **Lagos-only
launch paced to review-console capacity**.

**v1.0 ships.**

### Phase 7 — Tenancy (Weeks 33–40) — *v1.1*
Agreement templates and e-signature, rent schedule and receipts, maintenance tickets, **condition
records and the move-out comparison**, landlord portfolio, saved searches.

### Phase 8 — Depth & Reach (Weeks 41–50) — *v1.2*
360° tours, commute-time filtering, area guides, application and screening flow, Abuja and Port
Harcourt.

---

## 3. Risk Register

| # | Risk | Severity | Response |
|---|---|---|---|
| R1 | **Too few listings makes the product look empty** | High | Accepted structurally. The wedge works at zero inventory. Copy owns the trade-off explicitly. **Verification is never relaxed to close a volume gap** — doing so destroys the only thing Keys sells |
| R2 | **Defamation exposure from published reports** | **Critical** | Mandatory human review, evidence requirement, 7-day right of reply, publication only on `upheld`, 24-month expiry, resolution path. **Legal review before Phase 1 launch, not after** |
| R3 | Agents evade geotagged capture | High | Device-signed captures verified server-side, injected-upload rejection, mock-location detection, human review on geo mismatch. Release-blocking tests |
| R4 | Perceptual hashing evaded | High | Two algorithms, adversarial corpus in CI, human review at near-threshold, hashes retained for expired and rejected listings, stock-corpus screening |
| R5 | **Human-review queue becomes the growth bottleneck** | High | Review console is a first-class surface built in Phase 1; throughput measured from launch; **city rollout paced to review capacity rather than to demand** |
| R6 | Agents refuse the friction and stay on portals | High | The verified badge is a commercial asset — better-qualified leads and a defensible reputation. Free tier of 2 listings lowers the entry cost. Measured as agent activation rate |
| R7 | Video costs dominate infrastructure spend | Medium | Aggressive transcoding, 3-minute cap, CDN, data-saver default on metered connections |
| R8 | Overclaiming verification scope creates legal exposure | High | "Authority to let, not title" on every listing page and in every verification surface; legally reviewed copy |
| R9 | Scope creep into escrow or rent collection | Medium | Explicit non-goal; no payment integration exists; the schema itself has no transaction columns |

---

## 4. Definition of Done

- [ ] Domain package unit tested, ≥ 95%
- [ ] **Verified-status rules property-tested if the listing path was touched**
- [ ] Works on **mobile and web** where the FRD requires both
- [ ] Verified on physical Android **and** physical iOS
- [ ] Verified on desktop and mobile web
- [ ] Media budgets met
- [ ] Light and dark authored on both surfaces
- [ ] 200% text scaling; web keyboard-navigable
- [ ] Screen-reader labelled
- [ ] **Copy reviewed against the overclaiming guidelines** — does this imply protection we don't provide?
- [ ] Maestro (mobile) and Playwright (web) E2E in CI

---

## 5. Success Gates

| Gate | Threshold | If missed |
|---|---|---|
| Phase 1 | No unreviewed report publicly retrievable | **Hard stop** |
| Phase 1 | Legal review of the report policy signed off | **Hard stop — do not launch the registry** |
| Phase 1 + 60 days | 5,000 lookups performed | The wedge is not landing; reconsider positioning before building the marketplace |
| Phase 3 | Verified-status and hashing gates pass | **Hard stop** |
| Phase 4 | Search < 1.5 s; listing pages indexed | Optimise before launch — discovery depends on it |
| v1.0 + 90 days | > 95% of listings real and available on random audit | **Suspend growth and investigate.** This number *is* the product |
| v1.0 + 90 days | < 2% of inspections reported as mismatched | Investigate the verification pipeline |
| v1.1 + 90 days | 50% of tenants active at 6 months | Reassess whether tenancy is the right retention engine |

The 95% audit gate is the one that governs everything. **Keys sells the belief that a listing is
real. If a random audit cannot sustain that number, no amount of growth is worth having** — and
the correct response is to stop selling until it can.
