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

**On the app as well as the web.** The agent screens landed on the phone with a two-tab
bottom bar — Check and Account. Navigation was deferred to phase 4 on the grounds that a
tree drawn before its screens exist is a guess; that stopped being true once there was a
screen a tenant uses and a screen an agent uses, and they are not steps in a flow. It is
`useState`, not a library: the moment there is a second thing to go *back* to — listing
pages reached from search, in phase 4 — it becomes a router.

**What is not:** the liveness and ID TurboModule, which needs a KYC vendor nobody has
chosen — R6. Agents can open an account and draft listings, and cannot climb past
`unverified`, which both surfaces say plainly rather than offering a step that cannot help.
The agent's session on the phone is in `AsyncStorage` rather than the Keychain — R8, and a
hard blocker on any real agent account.

## Phase 3 — Listing Integrity (Weeks 14–19) — **the technical core** · **phase gates green**
Geotagged in-app capture with device signing, mock-location detection, video capture and
transcoding, perceptual hashing with BK-tree indexing, the duplicate-match pipeline, the
`is_verified` computation, forced expiry with per-listing confirmation.

**Built so far:** the seven-condition rule in `packages/domain/src/listings.ts`, computed and
never stored; perceptual hashing with a BK-tree in `packages/domain/src/hashing.ts`, including
a second hash of each image's middle because the corpus proved a 6% crop defeats a single
difference hash; and the agent's own listings now name which conditions are unmet and what to
do about each, including the ones Keys cannot yet check.

**A match never blocks on arithmetic.** `verdictFor` returns `pending`, never `blocked` — the
same photograph legitimately appears on two listings when an agency changes hands or a flat is
re-let, and auto-blocking would take an honest agent's listing down with no person involved.

*Exit gates. All three are **phase gates** under
[ADR 0007](adr/0007-a-gate-blocks-the-next-phase-or-it-blocks-the-release.md) — they were
written as release blockers before that split existed, and each is testable in software
today. A listing wrongly marked Verified is the failure everything above it rests on, so
none of them can wait for launch.*

1. ✅ **Property-based: no input combination yields Verified unless all seven conditions
   hold.** Exhaustive rather than sampled — 128 combinations, every one enumerated, with the
   named reasons asserted to be exactly what was broken. `isVerified` is *defined* as
   "nothing unmet", so the badge and the explanation cannot drift apart.
2. ✅ **Adversarial hashing corpus.** Nine attacks — rescaling both ways, hard recompression,
   6% and 10% crops, a watermark bar, brightening, darkening, contrast, and all of them
   together — over twelve synthetic rooms. The worst attack moves 8 of 64 bits against a
   threshold of 10; the two most similar different rooms are 21 apart. Both margins are
   asserted, not just the pass.

   **Wired end to end.** An accepted capture is hashed, matched against every image Keys
   holds, and indexed — after acceptance, never before, so a refused upload cannot poison
   the index. A listing is never matched against its own earlier photographs. A match opens
   a pair in the reviewer's queue at `/v1/duplicates`, asked once per pair rather than once
   per file; blocking the copy feeds `blockedDuplicate` and costs it the badge, and the
   listing that had the picture first is untouched.

   **What it does not catch, written down rather than excused:** a horizontal flip, which
   inverts every column comparison. There is a test asserting it is missed, so the hole
   cannot be forgotten. Indexing both orientations doubles the index and is a decision to
   take deliberately.
3. ✅ **An injected upload that did not pass through in-app capture is rejected** by
   signature verification. Real Ed25519, fifteen assertions: no signature at all (the
   gallery case), a key the attacker generated, a genuine signature over different
   coordinates, a genuine signature over a different photograph, the same signed capture
   twice, a stale one, an unknown device, another agent's device with that device's own real
   signature, and a malformed signature that must not 500 a route anybody with an agent
   token can probe.

   The location, the timestamp and the mocked-location flag are **inside** the signed
   message, so a modified client cannot change any of them — signing as mocked and sending
   as real is refused as a bad signature rather than laundered.

   The bytes are checked, not assumed: the SHA-256 inside the signature is verified against
   the upload, so a genuine capture's paperwork cannot be attached to a stolen photograph.

   **The phone side is built.** `KeysSigning` generates a P-256 key inside the Secure
   Enclave and signs there; the private half is never readable, by anything, including the
   app. A capture signed on the simulator was accepted by the server and matched as a
   duplicate against one signed by a separate client — the whole chain, across two callers.

   **P-256, not Ed25519, and that was forced.** The enclave holds P-256 keys and nothing
   else — there is no `SecureEnclave.Curve25519`. Ed25519 would have meant a private key in
   software, extractable from a backup or a jailbroken phone, and a stolen signing key is
   somebody able to sign captures for a property they have never visited. The scheme was
   Ed25519 until the phone side was written; the server verifies ECDSA P-256 over SHA-256
   now, and refuses the old curve.

   **Forced expiry is wired.** A published listing carries `last_confirmed_at`, an agent
   confirms it from their own screen, and `recently_confirmed` reads the real date. It is
   null until somebody confirms — publication is deliberately *not* treated as a
   confirmation, because that would hand every listing a free fortnight and make the first
   confirmation the one nobody ever does.

   **Walkthrough video too.** The same controller records a walkthrough with sound, refuses
   to stop before thirty seconds and says how long is left, and returns **one frame from a
   second in** as what gets hashed — a video's bytes are megabytes and change completely on
   every re-encode, so hashing the file would say nothing about whether two agents are using
   the same footage. A frame goes through the same perceptual hash a photograph does.

   The duration is **inside the signature** (`keys.capture.v2`). It was beside it, which
   meant a two-second clip could claim thirty and satisfy the condition that exists to make
   an agent walk the flat.

   **The camera is built.** `KeysCapture` presents AVFoundation, takes one photograph,
   attaches CoreLocation's position and whether the OS thinks it was faked, and returns the
   greyscale grid the hash reads. There is deliberately **no gallery picker** — the
   signature's whole claim is that the bytes came out of this camera, so an alternative path
   would be a hole with a button on it.

   **Not verified:** a simulator has no camera. Everything except the photograph itself has
   been exercised — the refusal, the permission prompt, the enclave signature, the hash, the
   upload — and R11 carries the rest.
   Media arrives as a raw greyscale grid rather than a JPEG — the capture module will emit
   one alongside the encoded file, which keeps a native image decoder out of the server.

## Phase 4 — Search & Discovery (Weeks 20–23)
Postgres FTS + PostGIS search, filters with Verified defaulting on, map search, ranking in the
domain package, total-cost calculation, listing pages with the evidence panel, **SSR and
structured data on web**.

**Phase gate — ✅ green.** A search never returns a listing the searcher could not have
seen. Verified is computed on every search from the same evidence the agent's own screen
reads — `assessListing`, one implementation, nothing else may compute it. Every way of
losing the badge is exercised separately: the landlord withdraws, a reviewer withdraws the
ID, a reviewer blocks an image, the fortnight lapses. Each takes the listing out of the
*very next* request. Adding a cache fails it; filtering before assessing fails it.

**Release gates:** sub-1.5 s results, rendered HTML asserted to contain listing content, and
structured data validating. All three are about a deployment nobody has stood up.

**Starts by closing a phase-3 loop.** `capture_on_site` has been unmet on every listing since
it was written, because `provesPresence` needs a distance and nothing knew where a property
*was*. Properties get coordinates here, which is the same thing search needs.

## Phase 5 — Marketplace Loop (Weeks 24–27) · **current**
Messaging with deferred contact exchange, inspection requests with fee policy, outcome recording
with the automatic Verified suspension on `didn't exist`, listing reports, featured placement
(Verified-only, capped).

**Phase gate.** *A stranger cannot reach an agent's phone number, and a stranger cannot take
a listing down.* Both halves are about the same thing — what an unknown party is allowed to
do to somebody — and both have an obvious wrong answer that ships in most marketplaces.

Contact details are exchanged when both sides agree and not before. Nothing in any response,
at any point in a conversation, contains a number either party has not been given. And an
outcome of *the property did not exist* suspends the badge immediately, because a tenant who
went to an address and found nothing should not watch the listing stay Verified — but the
remedy is a fresh signed capture at the coordinates, which costs an honest agent a walk and
is impossible for a liar. A suspension a stranger can trigger and only a reviewer can lift
is a griefing tool; one the agent can lift with the same evidence the badge already rests on
is not.

**Amended from "on all three surfaces".** This is a React Native product. The web app exists
and is not where the marketplace loop is being built, and a gate naming a surface nobody is
shipping is a gate that either blocks forever or gets waived — [ADR-0004](adr/0004-a-gate-that-cannot-fail-is-not-a-gate.md)
applies to gates that cannot *pass* for the same reason. The web equivalent is a release
gate if it is anything.

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
