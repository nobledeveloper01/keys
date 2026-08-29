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

**Phase 1 of 8. The scam registry works; nothing is deployed.** `PHASE` holds
the number and [`docs/ROADMAP.md`](docs/ROADMAP.md) holds the gates, each one
split into what blocks the next phase and what blocks a release.

| | |
|---|---|
| Mobile | React Native 0.87, New Architecture, TypeScript strict |
| Web | Next.js 15 with SSR — listing pages are a business requirement, not a roadmap item |
| Server | **NestJS 11 on Node 22**, importing the same rules the phone runs |
| Data | PostgreSQL 16 — durable, with the publication rule as `CHECK` constraints. **PostGIS is not installed yet**; nothing needs it until listings |
| Rules | `packages/domain`, pure TypeScript, three consumers, [Apache-2.0](packages/domain/LICENSE) |
| Wire | `packages/api`, generated from the controllers, [gated against drift](scripts/api-fresh.sh) |
| Languages | English, Hausa, Yoruba and Igbo, in every string the app renders |

**There is no parity suite here, and that is the point.** The last project in
this portfolio had a C# server mirroring a TypeScript domain, held together by
generated fixtures. This one imports the domain, so a rule cannot drift because
there is only one of it. See
[ADR-0001](docs/adr/0001-the-server-imports-the-domain-rather-than-mirroring-it.md).

### What works end to end

Run the server and the web app (below) and you can, right now:

- **Check a number.** `0803…`, `+234 803…` and `803…` all normalise to the same
  number, because a registry that treats them as three answers *nothing found*
  about a number it holds — which on this product is not an empty result, it is
  a false all-clear.
- **Report one.** The page states what happens next *before* it asks for
  anything: a person reads it, the number gets seven days to answer, it appears
  only if upheld, and only for two years.
- **Watch it not be published.** The report is submitted, the lookup still says
  zero, and the review console refuses to uphold it — first for having no
  evidence, then because the reply window is open. Both refusals come from
  `packages/domain`, not from the console.
- **Answer one.** `/reply?token=…` shows the reported party what was said, with
  *nothing has been published* above the accusation rather than below it, and
  never the reporter.

And on the phone: the language picker, then the lookup screen, in whichever of
the four languages was chosen.

### What is not built

Named here rather than left to be discovered:

- **No native projects.** `ios/` and `android/` are not generated, so the app
  compiles and its screens are tested, but it runs on no device yet.
- **No PostGIS.** Reports need no geospatial index; listings will, in phase 3.
  Postgres itself is wired: reports survive a restart, and `/healthz` asks the
  store rather than the environment, so it cannot claim durability a running
  server does not have.
- **No SMS**, so the reply token is generated and honoured but never delivered.
  This is phase 1's second exit gate and it is open.
- **No file upload.** Object storage is phase 3, and the domain refuses to
  uphold a report with no evidence, so a reviewer records what they saw and how
  it reached them — keyed `reviewer-attested:` so an audit can tell the
  difference. See [the roadmap](docs/ROADMAP.md#phase-1--the-scam-registry-weeks-48--the-wedge--current).
- **No legal review.** Phase 1 carries a human gate — a Nigerian lawyer reading
  the report policy — and it blocks public launch outright. No test result
  substitutes for it.

### Running it

```bash
make setup                 # pnpm install, the local databases, and the git
                           # hooks — once
make ci                    # every gate: typecheck, lint, boundary, docs,
                           # wired, untranslated, api-fresh, and the tests
```

`make setup` points git at `.githooks`, so `make ci` runs before every push.
`--no-verify` skips it, deliberately: a hook that cannot be skipped is a hook
people delete.

The server, with a reviewer token long enough for the guard to accept:

```bash
KEYS_REVIEWER_TOKEN=$(openssl rand -hex 24) PORT=5211 pnpm --filter @keys/server start
```

Without `KEYS_DATABASE_URL` it starts on an in-memory store and says so —
`/healthz` answers `durable: false`. That fallback announces itself rather than
defaulting the other way, because a server that quietly loses every report on
restart while every log line looks normal is worse than one that will not start.

```bash
make db     # createdb keys_test and keys_dev, once
KEYS_DATABASE_URL="postgres://$USER@localhost/keys_dev" \
KEYS_REVIEWER_TOKEN=$(openssl rand -hex 24) PORT=5211 \
  pnpm --filter @keys/server start
```

The web surface, pointed at it:

```bash
KEYS_API_URL=http://127.0.0.1:5211 pnpm --filter @keys/web dev
```

`KEYS_API_URL` has no localhost fallback, deliberately: a production build
silently pointing at somebody's laptop is worse than one that refuses to start.

### Configuration

Every one of these changes what the server will *refuse* to do, which is why
they are listed together rather than left in whichever file reads them.

| Variable | Read by | Unset means |
|---|---|---|
| `KEYS_DATABASE_URL` | server | In-memory store. Announced: `/healthz` says `durable: false` |
| `KEYS_REVIEWER_TOKEN` | server | **The review console refuses everybody.** An unconfigured server has no console, not an open one. Shorter than 32 characters is also refused |
| `KEYS_CORS_ORIGINS` | server | No browser may call the API. `*` is rejected at startup — the process will not boot |
| `KEYS_API_URL` | web | **The web surface will not start.** There is no localhost fallback: a production build silently pointing at somebody's laptop is worse than one that refuses |
| `KEYS_TEST_DATABASE_URL` | tests | Server suites run against the in-memory store only, and `make test` prints a warning saying so |

Each default is the one that fails loudly. That is the pattern, not a
coincidence: a missing secret should stop the thing that needs it, never quietly
widen what is allowed.

### The gates

`make ci` runs eight of them, and every one has been **proved to fail** by
breaking what it guards and watching it go red:

| Gate | Holds |
|---|---|
| `typecheck` | Four packages, TypeScript strict, `exactOptionalPropertyTypes` |
| `lint` | ESLint across every package |
| `boundary` | `packages/domain` imports nothing platform-specific |
| `doc-check` | Required documents exist, are tracked, and the roadmap marks the phase `PHASE` says |
| `wired-check` | Nothing is exported, tested, and called by nothing |
| `untranslated` | No English string is rendered by a screen without going through `say()` |
| `api-fresh` | The generated client still matches the controllers |
| `test` | 76 across the four packages: 34 domain, 36 server, 4 wire, 2 app |

The server suites run **against every store implementation** — in memory and
Postgres — because a suite that only exercises the `Map` proves something about
a `Map`. `make test` finds a database if one is reachable and says plainly when
it cannot, rather than passing quietly on half the coverage.

Three of these could not fail when phase 1 began — they were ported from the
previous project and were scanning directories that do not exist here, or
returning zero unconditionally. That is written up in
[ADR-0004](docs/adr/0004-a-gate-that-cannot-fail-is-not-a-gate.md), and every
gate now fails when it examines nothing.

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
