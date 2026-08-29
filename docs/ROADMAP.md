# Keys — Roadmap

`PHASE` holds the current number. The delivery plan this is derived from, with
the risk register and success gates, is
[`docs/06-ROADMAP.md`](06-ROADMAP.md); this file is the live tracker.

A phase is done when its exit gate is green, not when the code is written.
Gates are written before the phase starts and are not softened to fit what got
built.

**Each gate has three halves**, because three different kinds of thing block a
release and only one of them is code.

| Kind | Blocks | Example here |
|---|---|---|
| **Software** | the next phase | duplicate detection meets its threshold |
| **Hardware** | the release | geotagged capture on a real Transsion handset |
| **Human** | the release | legal review of the report policy |

`PHASE` tracks the software gate, because that is the one that says what to
work on next. **v1.0 does not ship until every deferred gate is green.**

---

## Deferred, and not to code

Listed here from the start rather than discovered at the end.

| From | Condition | Kind |
|---|---|---|
| Phase 1 | **Legal review of the report policy, signed off.** Do not launch the registry without it | Human |
| Phase 3 | Geotagged capture verified on physical Android and iOS, including a low-end Transsion | Hardware |
| Phase 3 | Liveness and ID capture verified on real cameras | Hardware |
| Phase 6 | Review-console throughput measured, and city rollout paced to it | Human |
| Phase 6 | Hausa, Yorùbá and Igbo tables read by native speakers | Human |
| Definition of done | Verified on physical devices and on desktop and mobile web | Hardware |

Keys' own risk register calls defamation exposure critical and review-queue
throughput the growth bottleneck. Both are on this list because neither can be
closed by writing more code.

---

## Phase 0 — Foundation · **current**

Monorepo with mobile, web, server and shared packages. Domain boundary lint.
React Native New Architecture. Next.js with SSR. Design tokens across both UI
targets. Postgres with PostGIS. CI building mobile artefacts and deploying web
previews.

**Software gate:** one domain package imported by mobile, web and server,
proven in CI, with the boundary rule proved to fire by being made to fail.

---

## Phase 1 — The Scam Registry (Weeks 4–8) — the wedge — **software gate green**
Public lookup with no account, reporting with evidence, **the human-review console**, right of
reply with the 7-day window, publication gating, expiry and resolution.

**Exit gates:**
1. ✅ **Software — no unreviewed report is publicly retrievable by any query path.**
   `apps/server/test/no-unreviewed-report-escapes.test.ts` reads the routes out of the
   running router rather than naming them, so a route added later is covered on the day
   it is written. Proven to fail by removing the reviewer guard, leaking the reporter id,
   and adding a debug route that dumps the store. See [ADR 0002](adr/0002-nothing-is-published-until-a-person-upheld-it.md).
2. ⏳ **Software — right-of-reply flow works end to end, including for reported parties
   who have no Keys account.** The capability is generated, stored and honoured, and
   `/reply` on the web surface renders and posts against it. Nothing delivers the token
   yet. **Blocked on the SMS provider in phase 3.**
   See [ADR 0003](adr/0003-the-accused-answers-with-a-texted-capability-not-an-account.md).
3. ⏳ **Human — review console throughput measured.** Needs a real reviewer and real
   reports; cannot be measured against fixtures.
4. ⏳ **Human — legal review of the report policy by a Nigerian lawyer.**
   **Blocks public launch outright.** No test result substitutes for it.

**Known limitations at the end of phase 1**

- **No file upload.** Object storage lands in phase 3, and `review()` refuses to uphold
  a report with no evidence, so without a bridge every report reachable from the web
  form would have been permanently unupholdable — two correct decisions with no path
  between them. The bridge is `POST /v1/review/:id/evidence`, where a reviewer records
  what they saw and how it reached them. It is weaker than a file and the row says so:
  the key is prefixed `reviewer-attested:`. Phase 3 replaces it.
- **The store is in memory.** Postgres and PostGIS land in phase 2; `/healthz` reports
  `durable: false` so this cannot be mistaken for a deployment.
- **No SMS.** See gate 2.

**Launched publicly at the end of this phase**, standalone, with no listings at all.

## Phase 2 — Agent Verification & Authority (Weeks 9–13)
Liveness and ID TurboModule, tiers, agent profiles, authority upload and review, **landlord
co-verification by OTP**, revocation cascade.

**Exit gate:** tier gates enforced server-side and unbypassable from a modified client; revocation
unpublishes dependent listings atomically.

## Phase 3 — Listing Integrity (Weeks 14–19) — **the technical core**
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

## Phase 4 — Search & Discovery (Weeks 20–23)
Postgres FTS + PostGIS search, filters with Verified defaulting on, map search, ranking in the
domain package, total-cost calculation, listing pages with the evidence panel, **SSR and
structured data on web**.

**Exit gate:** sub-1.5 s results; rendered HTML asserted to contain listing content; structured data
validating.

## Phase 5 — Marketplace Loop (Weeks 24–27)
Messaging with deferred contact exchange, inspection requests with fee policy, outcome recording
with the automatic Verified suspension on `didn't exist`, listing reports, featured placement
(Verified-only, capped).

**Exit gate:** end-to-end from search to inspection outcome, on all three surfaces.

## Phase 6 — Launch Hardening (Weeks 28–32)
Media pipeline budgets enforced, data-saver, offline saved listings, device matrix, accessibility
audit on mobile and web, legal review of agreement templates and report policy, **Lagos-only
launch paced to review-console capacity**.

**v1.0 ships.**

## Phase 7 — Tenancy (Weeks 33–40) — *v1.1*
Agreement templates and e-signature, rent schedule and receipts, maintenance tickets, **condition
records and the move-out comparison**, landlord portfolio, saved searches.

## Phase 8 — Depth & Reach (Weeks 41–50) — *v1.2*
360° tours, commute-time filtering, area guides, application and screening flow, Abuja and Port
Harcourt.

---

---

Read [`CHANGELOG.md`](../CHANGELOG.md) for what changed and why,
[`docs/JOURNAL.md`](JOURNAL.md) for what surprised us, and
[`docs/adr/`](adr/) for the decisions that are settled.
