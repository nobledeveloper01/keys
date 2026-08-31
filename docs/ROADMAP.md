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

## Phase 0 — Foundation

Monorepo with mobile, web, server and shared packages. Domain boundary lint.
React Native New Architecture. Next.js with SSR. Design tokens across both UI
targets. Postgres with PostGIS. CI building mobile artefacts and deploying web
previews.

**Software gate:** one domain package imported by mobile, web and server,
proven in CI, with the boundary rule proved to fire by being made to fail.

**Was called green early, and closed during phase 1.** The gate was met on the
server alone. `apps/mobile` was not a package — seventeen ported `.tsx` files,
no manifest, no tsconfig — so nothing had ever compiled them. Making it one
surfaced sixteen type errors and an import of a module that does not exist. All
three targets now import `@keys/domain` and all three are compiled by `make ci`.

It is recorded here rather than backdated, because a gate called green early is
worth more as a visible debt than as a corrected date.

**Postgres closed too.** Reports are durable, the publication rule is enforced
in the domain, in the query *and* in the table
([ADR-0005](adr/0005-a-rule-this-serious-lives-in-three-places.md)), and both
server suites run against every store implementation rather than only the
in-memory one. **PostGIS is not installed**; nothing needs it until listings in
phase 3.

**The native projects are in**, from the React Native 0.87.1 template with the
bundle identifier `ng.keys.app` and a Metro config that watches the workspace.
iOS compiles for the simulator. **Android has not been compiled on this
machine** — there is no JDK installed — so it is the unmodified template and
nobody has watched it succeed.

`make bundle-check` now proves the JavaScript half builds and that all four
languages reach the artefact a device runs, which nothing previously did: `tsc`
and Metro resolve modules by different rules and in a monorepo they disagree for
a living.

Still open from this phase: **an Android build somebody has watched succeed**,
**CI building mobile artefacts**, and **a settings screen that mounts
`ThemeToggle`** — until one exists, dark mode is unreachable in the app and its
palette is verified by eye rather than by anything that runs.

---

## Phase 1 — The Scam Registry (Weeks 4–8) — the wedge · **phase gate green**
Public lookup with no account, reporting with evidence, **the human-review console**, right of
reply with the 7-day window, publication gating, expiry and resolution.

**Exit gates:**
1. ✅ **Phase gate — no unreviewed report is publicly retrievable by any query path.**
   `apps/server/test/no-unreviewed-report-escapes.test.ts` reads the routes out of the
   running router rather than naming them, so a route added later is covered on the day
   it is written. Proven to fail by removing the reviewer guard, leaking the reporter id,
   and adding a debug route that dumps the store. See [ADR 0002](adr/0002-nothing-is-published-until-a-person-upheld-it.md).
2. ⏳ **Release gate R1 — right-of-reply flow works end to end, including for reported
   parties who have no Keys account.** The capability is generated, stored and honoured, and
   `/reply` on the web surface renders and posts against it. Nothing delivers the token
   yet. **Blocked on the SMS provider in phase 3.**
   See [ADR 0003](adr/0003-the-accused-answers-with-a-texted-capability-not-an-account.md).
3. ⏳ **Release gate R2 — review console throughput measured.** The console exists at
   `/review` on the web surface, every action names a reviewer and states a
   reason, and `GET /v1/review/metrics` reports decisions by reviewer alongside
   the queue depth and the age of the oldest waiting report. **The instrument is
   built; the number still needs a real reviewer working real reports.**
   See [ADR 0006](adr/0006-a-reviewer-is-not-an-answer-to-who-decided-this.md).
4. ⏳ **Release gate R3 — legal review of the report policy by a Nigerian lawyer.**
   **Blocks public launch outright.** No test result substitutes for it.

**Known limitations at the end of phase 1**

- **No file upload.** Object storage lands in phase 3, and `review()` refuses to uphold
  a report with no evidence, so without a bridge every report reachable from the web
  form would have been permanently unupholdable — two correct decisions with no path
  between them. The bridge is `POST /v1/review/:id/evidence`, where a reviewer records
  what they saw and how it reached them. It is weaker than a file and the row says so:
  the key is prefixed `reviewer-attested:`. Phase 3 replaces it.
- **PostGIS is not installed.** Postgres is; reports are durable and `/healthz` asks the
  store rather than the environment. Nothing needs geospatial until listings in phase 3.
- **No SMS.** See gate 2.

**Launched publicly at the end of this phase**, standalone, with no listings at all.

## Phase 2 — Agent Verification & Authority (Weeks 9–13) · **phase gate green**
Liveness and ID TurboModule, tiers, agent profiles, authority upload and review, **landlord
co-verification by OTP**, revocation cascade.

**Phase gate — ✅ green.** A tier is computed only from evidence the claimant cannot write,
and no value a client sends can raise one: `no-client-can-raise-its-own-tier.test.ts` walks
every route in the running router with every tier-shaped field name, in the body and the
query, and checks both what each route *says* and what the store ends up holding.
Revocation cascades inside one transaction, proven by deleting the cascade and watching it
fail. Thirty assertions, against the in-memory store and against Postgres.

**Release gates opened by this phase:** R4 (an Android build somebody has watched succeed),
R5 (dark mode reachable through a settings screen), R6 (agents can complete an ID check)
and R7 (an SMS a real phone received). All four are in [the ledger](RELEASE-GATES.md).

**What is built:** the ladder and its rules in `packages/domain`; landlord co-verification by
one-time code, in both directions, addressed to the number on the record; the revocation
cascade in one transaction; agent profiles, public by id and by phone; the agent's own page
on the web, with an httpOnly session; the landlord's page; and the agent list in the review
console with the identity withdrawal.

**What is not:** the liveness and ID TurboModule, which needs a KYC vendor nobody has
chosen — R6. Agents can open an account and draft listings, and cannot climb past
`unverified`, which the agent page says plainly rather than offering a step that cannot
help. The agent's screens are on the web only; the app gets them when the router lands in
phase 4, and building one now would mean guessing the shape of a navigation tree before the
screens in it exist.

## Phase 3 — Listing Integrity (Weeks 14–19) — **the technical core** · **current**
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
