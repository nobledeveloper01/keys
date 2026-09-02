# Keys — Backend Requirement Specification

## Verdict

| Question | Answer |
|---|---|
| **Does Keys need a backend?** | **Yes — from v1.0. It is the most backend-dependent product in the portfolio** |
| **Why?** | Everything Keys sells is a *judgement about someone else's claim*. Verification, duplicate detection, reach of a scam report, and Verified status must all be decided somewhere a client cannot reach |
| **Can it work offline?** | **Only for reading what you already have** — saved listings and, critically, **all tenancy documents**. Search, verification and reporting are inherently online |
| **What is unusual about it?** | **A human-review console is a first-class product surface**, and its throughput is a hard constraint on company growth |
| **Build cost** | ~10 weeks for one backend engineer, plus a media pipeline, plus ongoing review staffing |

---

## 1. Why the Server Must Be Authoritative

In Grid the server is optional. In Vitals it is a replica with no special authority. **In Keys the
server is the referee**, and that is the whole point: every value Keys provides is an assertion
that something a *third party* claimed is true.

| Decision | Where | Why not the client |
|---|---|---|
| **Is this listing Verified?** | **Server only** | A client-computed badge is a badge anyone can print |
| **Is this photograph already in use elsewhere?** | **Server** | Requires comparison against every image ever uploaded |
| **Did this capture happen at the property?** | **Server verifies the device signature** | The client produces the signature; only the server can validate it |
| **May this agent let this property?** | **Server + human review** | Involves a second party (the landlord) and documents |
| **Should this scam report be public?** | **Server + human review** | Defamation exposure. Never automatic |
| **What rank does this listing get?** | **Server** | Otherwise ranking is buyable client-side |
| Search | Server | Postgres FTS + PostGIS |
| Saved listings, tenancy documents | **Client, offline** | A tenant in a dispute needs their agreement *at that moment* |

---

## 2. Architecture

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | Node.js 22 / TypeScript | Shares `packages/domain` with mobile and web — **Verified-status rules must not drift across surfaces** |
| Framework | **NestJS 11** | Decorators are the single description of the wire: the OpenAPI document is generated from the controllers, the typed client from that document, and [`scripts/api-fresh.sh`](../scripts/api-fresh.sh) fails the build when either drifts. Fastify was the original choice for schema-first validation; NestJS gets the same property from one source instead of two |
| Database | **PostgreSQL 16 + PostGIS** | Geospatial search, FTS, generated columns, strong constraints. **No separate search cluster** at this scale |
| Image hashing | Native/WASM pHash + dHash, **BK-tree index** | Sub-linear Hamming search over millions of hashes |
| Object storage | S3-compatible + CDN | Photos, video renditions, documents |
| Transcoding | FFmpeg workers on a queue | HLS 240p/360p/720p |
| Cache / queue | Redis + BullMQ | Hashing, transcoding, review routing, expiry sweeps |
| Web | Next.js SSR/ISR | **Listing pages must be indexable** — a business requirement, not a preference |
| KYC | Vendor API (ID + liveness) | Not built in-house |
| SMS | Local gateway | OTP and landlord co-verification links |
| **Review console** | **Internal React app, first-class** | Listing integrity, authority documents and scam reports all route through people |

### Endpoint surface

Everything is under `/v1`, because a public registry with no account has no
client we can ask to upgrade.

**The list of what exists is `packages/api/openapi.json`, generated from the
controllers**, and `make api-fresh` fails the build when it drifts from them.
This section used to try to be that list: it marked eleven endpoints as built
when there were forty-five, and planned several — `/listings/:id/media/presign`,
`/authorities/:id/landlord-verify` — that were built under other names or
replaced by a different mechanism entirely. A hand-kept mirror of a generated
fact is a second source of truth, and this one had been wrong for four phases.

So what belongs here is the *shape*, which the generated document cannot say:

| Group | Who may call it | The point |
|---|---|---|
| `/v1/registry/*` | **anybody, no account** | The wedge. A lookup answers about a number without asking who is asking |
| `/v1/listings`, `/v1/listings/{id}` | anybody, no account | Search and one listing. Drafts are 404, never 403 |
| `/v1/agents/me/*` | an agent's own token | Their listings, their evidence, their captures |
| `/v1/conversations/*`, `/v1/inspections/*` | a tenant's own token | The marketplace loop. A separate header from the agent's, deliberately |
| `/v1/agent/*` | an agent's own token | The same conversations and inspections, from the other side |
| `/v1/authority/*` | a texted code, or the KYC token | The landlord, who has no account and never gets one |
| `/v1/review/*`, `/v1/agent-review/*` | the reviewer guard | The console. Every route behind one door |
| `/v1/captures`, `/v1/duplicates` | an agent's token, or a reviewer's | Signed media in; duplicate pairs out |

Two things that are *not* endpoints and never will be: there is no route that
reaches the outbox, because a one-time code sitting in a queue is a one-time
code; and there is no route that accepts a verification outcome, because nothing
a client sends may decide one.

**Note the absences.** There is no bulk-confirm endpoint, no endpoint accepting `is_verified`, no
endpoint returning `reporter_id`, and no payment endpoint of any kind. Each absence is a product
guarantee expressed as an API surface.

The `reporter_id` absence is the one that is already tested rather than merely
intended: `apps/server/test/no-unreviewed-report-escapes.test.ts` reads the
routes out of the running router — it does not name them — and asserts the
reporter's id appears in no response body from any of them. A route added in a
later phase is covered on the day it is written.

**There is also no lookup that answers about a number nobody upheld anything
about.** `/v1/registry/lookup` answers identically for a number with nothing
against it and a number the registry has never heard of, and says so in words,
because those two are the same fact and a reader must not take either for a
clean bill of health.

### Background jobs

**There are none, and that is the architecture rather than a gap.**

This table used to plan seven of them, and the entry for *Verified recompute — on
any input change + hourly sweep* described the design the product then
deliberately rejected. Nothing about a listing's status is stored, so there is
nothing to recompute: `assessListing` answers from evidence on every read, which
is why a listing that loses its badge is gone from the *very next* search rather
than from the next sweep. That is phase 4's exit gate, and a cache — including
one refreshed hourly — fails it.

A document promising an hourly sweep is worse than one that is silent, because
somebody writes code that waits for it.

What actually happens, and when:

| Work | When | Where |
|---|---|---|
| Perceptual hashing | on upload | `indexAndMatch` — compute, BK-tree lookup, open a review pair |
| Verified status | **on every read** | `assessListing`. Never stored, never swept, no `is_verified` column |
| Confirmation lapse | **on every read** | A date compared to now inside `unmetConditions`, not an expiry job |
| Paid placement lapse | **on every read** | `featured_until` compared to now, for the same reason |
| Expired report purge | on the read that would have returned it | `purgeExpired`, called from the reads rather than a scheduler — the comment above it says why |

Two things on the original list do not exist at all, and are release gates rather
than jobs: **video transcoding** needs a media pipeline (R14, R15), and **review
routing** needs more than one reviewer (R2). Search has no index to refresh —
[ADR-0008](adr/0008-sql-narrows-the-domain-decides.md) narrows in SQL and lets
the domain decide, so there is nothing materialised to go stale.

---

## 3. The Media Pipeline

The most infrastructure-heavy component, and the one that most affects unit economics.

```
Mobile capture (geotagged, device-signed)
   → client compress ≤ 400 KB + advisory pHash
   → presigned PUT
   → /media/commit:  verify device signature
                   → recompute hashes (authoritative)
                   → BK-tree lookup across ALL historical hashes
                   → verdict: clear | review | block
   → renditions: 120 / 400 / 1200 px, WebP + JPEG
   → CDN

Video → presigned PUT → FFmpeg queue → HLS 240/360/720
      → 240p rendition targeted ≤ 15 MB → CDN
```

Originals are retained server-side for audit and re-hashing even after renditions are generated,
because a future improvement to the hashing algorithm needs the originals to be useful
retroactively.

---

## 4. The Human-Review Console — a first-class surface

Three queues, and their combined throughput is the company's growth constraint:

| Queue | Volume driver | SLA |
|---|---|---|
| **Listing integrity** | Hash near-matches, geo mismatches, mock-location flags | 4 hours |
| **Authority documents** | Non-co-verified listings | 8 hours |
| **Scam reports** | User submissions | 48 hours before the reply window opens |

Requirements: full evidence in one view, decision templates with mandatory reasoning, reviewer
attribution and audit on every action, escalation to a senior reviewer, and **published
throughput metrics**.

**Built so far** (scam reports only; the other two queues arrive with listings in
phase 3): the console at `/review`, full evidence in one view, mandatory
reasoning with a length floor, reviewer attribution resolved from
`KEYS_REVIEWERS`, an append-only `decisions` audit table, and
`GET /v1/review/metrics`. **Not built:** escalation to a senior reviewer, and
decision templates — reasoning is free text, because a template is a thing to
design after watching what reviewers actually write.
See [ADR 0006](adr/0006-a-reviewer-is-not-an-answer-to-who-decided-this.md).

This is not internal tooling. **Keys expands city by city at the pace the review queue can
sustain**, and the console is what makes that pace measurable.

---

## 5. Security, Privacy & Legal

| Control | Requirement |
|---|---|
| **Verified status** | Computed server-side only. **No endpoint accepts it as input** |
| **Capture signatures** | Verified server-side; an unsigned or invalid capture cannot satisfy the geotag condition |
| **Reporter identity** | Never returned to any client, in any role, including the reported party |
| **Unreviewed reports** | Structurally unretrievable — the lookup query filters on `published_at IS NOT NULL`, which is null unless `upheld` |
| Verification documents | Encrypted at rest, access-logged, never returned to a counterparty — only the derived tier |
| Authority documents | Never shown to renters; only `proof_type` |
| Exact addresses | Withheld from public payloads; released on engagement |
| Contact details | Not exposed on listings; exchanged in-app on mutual engagement |
| EXIF | Stripped on upload; location comes from the signed capture record, never EXIF |
| Transport | TLS 1.2+, HSTS, certificate pinning on mobile |
| **Legal** | Report policy, agreement templates and verification claims **legally reviewed before launch**. "Authority to let, not title" stated wherever verification is claimed |
| **No money** | No escrow, no rent collection, no deposit holding. **The schema has no transaction columns** — the guarantee is structural |

---

## 6. Operating Cost

| Stage | Scale | Monthly |
|---|---|---|
| Registry only (Phase 1) | lookups, few reports | ~$40 |
| Lagos launch | 2,000 listings, 15k MAU | ~$400 |
| Growth | 10,000 listings, 80k MAU | ~$1,400 |
| Three cities | 30,000 listings, 250k MAU | ~$4,000 |

Cost drivers in order: **CDN and video egress**, then transcoding compute, then KYC checks, then
storage, then database. Mitigations: 3-minute video cap, aggressive 240p targeting, data-saver
defaults on metered connections, CDN caching with long TTLs on immutable renditions, and KYC only
at `id_verified` and above.

**The dominant real cost, however, is human review**, and it scales with listing volume rather
than with users. That is the number that determines how fast Keys can responsibly grow.

---

## 7. Client Consequences

1. **Clients compute Verified status only to preview it.** The same domain code runs on device so
   an agent sees "you still need a walkthrough" instantly — but the server decides, and the client
   renders what it is told.
2. **Media commit is a server checkpoint, not an upload confirmation.** An agent's photograph is
   not part of a listing until the server has verified its signature and cleared its hash.
3. **Tenancy documents are cached offline on every client.** A tenant in a dispute needs their
   agreement and condition record at that moment, not when the network returns. This is the one
   place where offline access is a genuine requirement rather than a nicety.
4. **The web app is not a companion.** It carries SSR listing pages for discovery and the full
   agency console, and it shares the domain package so its rules cannot drift from mobile's.
