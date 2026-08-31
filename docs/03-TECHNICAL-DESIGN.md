# Keys — Technical Design Document

| Framework | **React Native 0.87 (New Architecture), TypeScript strict** |
|---|---|
| Targets | **Android 8.0 (API 26)+, iOS 14+, and Web (React, SSR)** |
| Monorepo | pnpm + Turborepo, shared domain/api/ui packages |

---

## 1. Why React Native

**Keys is the clearest three-target product in the portfolio, and that decides the framework.**

Property search is a search-engine-discovered activity. A rental product without server-rendered,
indexable listing pages will not be found. Agencies work on desktops. Renters browse on phones.
All three surfaces are v1.0, not a roadmap item.

React Native lets the mobile apps and the React web app share a genuine domain package — listing
validation, the Verified-status rules, total-cost computation, search query construction, the
tenancy state machine — written once in TypeScript and consumed by all three, plus the server.
**The Verified-status rules in particular must not drift between surfaces**, and sharing the
implementation is how that is guaranteed.

The remaining native work — liveness SDK, geotagged capture, on-device perceptual hashing, video
capture and adaptive playback — is exactly the kind of vendor-SDK wrapping React Native handles
well.

**Where it costs us:** video capture and transcoding need native attention on both platforms, and
the liveness vendor SDK needs a TurboModule wrapper. Both are bounded, well-understood problems.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ apps/mobile     React Native — renter · agent · landlord      │
│ apps/web        React + SSR — public listings (SEO) + console │
├──────────────────────────────────────────────────────────────┤
│ packages/domain PURE TYPESCRIPT — no RN, no DOM               │
│                 VerificationRules · ListingIntegrity ·        │
│                 CostCalculator · TenancyStateMachine ·        │
│                 SearchQueryBuilder · ReportPolicy             │
├──────────────────────────────────────────────────────────────┤
│ packages/api    typed client generated from OpenAPI           │
│ packages/ui     tokens + primitives (RN + web variants)       │
├──────────────────────────────────────────────────────────────┤
│ native/android  LivenessModule · GeoCapture · PerceptualHash  │
│ native/ios      LivenessModule · GeoCapture · PerceptualHash  │
└──────────────────────────────────────────────────────────────┘
```

`packages/domain` is imported by the mobile app, the web app **and the server**. The server holds
final authority on Verified status; the clients use the same code purely to give immediate
feedback while an agent is building a listing.

---

## 3. Stack

| Concern | Choice | Rationale |
|---|---|---|
| Mobile | RN New Architecture | TurboModules for liveness and hashing |
| Web | React + Next.js (SSR/ISR) | **Listing pages must be server-rendered and indexable** — this is a business requirement |
| State | Zustand + TanStack Query | Shared patterns across mobile and web |
| Local DB | `op-sqlite` (mobile) / IndexedDB (web) | Behind one repository interface with three adapters |
| Camera | `react-native-vision-camera` | Frame processors for document edge detection and on-capture hashing |
| Video capture | VisionCamera + native transcode | H.264, capped 3 min |
| Video playback | `react-native-video` (ExoPlayer / AVPlayer), HLS on web | Adaptive bitrate everywhere |
| **Perceptual hashing** | **pHash/dHash via a native module on device; authoritative recompute server-side** | Client hashing gives the agent instant "this photo is already in use" feedback; **the server decides** |
| Maps | MapLibre (mobile) / MapLibre GL JS (web) | Cost control; consistent styling |
| Liveness / ID | Vendor SDK behind a TurboModule | Not built in-house |
| E-signature | Canvas capture, identical payload format on all three | |
| PDF | Server-generated for agreements and condition records | Must be identical and legally consistent across surfaces |
| Push | FCM + web push | One notification service |

**Rejected:** Expo managed (liveness SDK and geotagged capture need deep native access); a
mobile-only architecture (kills SEO, which kills discovery); client-authoritative hashing (an
agent could bypass duplicate detection with a modified client); Google Maps SDK (tile cost).

---

## 4. Listing Integrity — the engineering core

Everything Keys sells reduces to one question: **is this listing real?** Four mechanisms answer
it, and they are designed to be independent so defeating one does not defeat the system.

### 4.1 Geotagged on-device capture
At least one photograph must be captured **in-app**, with location recorded **at capture time**,
within 200 m of the stated address.

- Location is read at the moment the shutter fires, not from EXIF (which is trivially forged) and
  not at upload time.
- The capture is signed on-device with a key held in Keystore/Keychain, and the signature is
  verified server-side. A photograph injected into the upload path without going through capture
  fails verification.
- Mock-location detection is applied; a detected mock routes the listing to human review.
- **This requirement is why web upload alone cannot produce a Verified listing.** That limitation
  is the guarantee, not a gap.

### 4.2 Perceptual hashing
Every image is hashed (dHash for speed, pHash for robustness) and compared against **every image
ever uploaded** — active listings, expired listings, rejected listings, and a stock-photography
corpus.

- Hashes are stored as BK-tree-indexed values, giving sub-linear Hamming-distance search across
  millions of images.
- Matching survives resizing, recompression, minor cropping, watermarking and mild colour shift —
  which covers essentially every technique used to recycle a photograph.
- **Cross-agent, cross-city and cross-time matching is the point.** The signature of a fake
  listing is a photograph that has appeared somewhere else before.
- On-device hashing gives the agent immediate feedback while uploading; the **server recomputes
  and decides**, because a client-side check is advisory only.

### 4.3 Proof of authority
Landlord co-verification is the strongest and preferred path: the landlord receives an OTP link
and confirms that this agent may let this property. It is cheap, fast, and produces an
accountable second party.

Uploaded authorisation letters and management agreements are human-reviewed. The **document
itself is never shown to renters** — only the proof *type* — because the documents contain
landlords' personal information.

Revocation is immediate and cascading: a landlord withdrawing authority unpublishes every listing
that depended on it, in the same transaction.

### 4.4 Forced expiry
14 days, per listing, confirmed by a deliberate per-listing action.

**There is deliberately no bulk-confirm.** A bulk action would let an agent keep 200 stale
listings alive with one tap, which is precisely the behaviour the mechanism exists to prevent.
The friction is the feature.

---

## 5. Cross-Platform Capability Matrix

| Capability | Android | iOS | Web | Contract |
|---|---|---|---|---|
| Search, listing view | Full | Full | **Full + SSR** | Shared domain and API; web is a first-class target |
| **Geotagged capture** | Camera + location at shutter, device-signed | Same | **Blocked** | **Verified listings require mobile capture.** Deliberate limitation |
| Liveness / ID | Vendor SDK | Vendor SDK | Hand-off to mobile | Web prompts a QR hand-off to continue on a phone |
| Video capture | VisionCamera + transcode | VisionCamera + transcode | Upload only | Walkthroughs captured in-app |
| Video playback | ExoPlayer, HLS | AVPlayer, HLS | HLS | Adaptive on all three |
| Perceptual hash | Native module | Native module | Server only | Server authoritative everywhere |
| E-signature | Canvas | Canvas | Canvas | Identical payload format |
| Offline documents | SQLite + file store | SQLite + file store | IndexedDB + Cache API | One repository interface, three adapters |
| Push | FCM | APNs via FCM | Web push | One service |

---

## 6. Media Pipeline

Nigerian mobile data is expensive, and a property product is media-heavy. The pipeline is built
around that tension.

```
Capture (mobile, geotagged, signed)
  → on-device compress to ≤ 400 KB + on-device pHash
  → presigned upload (original retained server-side for audit and hashing)
  → server: recompute hash → BK-tree lookup → integrity verdict
  → generate renditions: thumb 120px / card 400px / full 1200px, WebP + JPEG fallback

Video capture
  → on-device H.264, capped 3 min
  → presigned upload
  → server transcode to HLS: 240p / 360p / 720p
  → 240p rendition targeted at ≤ 15 MB total
```

- The client requests the rendition appropriate to viewport and connection.
- **Data-saver mode** loads thumbnails only, disables autoplay entirely, and requires an explicit
  tap before any video byte is fetched.
- Playback must start within 3 s on 3G, which is what drives the 240p target rather than
  aesthetics.

---

## 7. Search

PostgreSQL with PostGIS and full-text search, rather than a separate search cluster. At this
scale — tens of thousands of active listings — a dedicated search engine adds operational cost
without meaningful benefit, and keeping search in Postgres means the Verified-status rules and the
geospatial filters live next to the data they filter.

Ranking is composed in `packages/domain` so it is identical on server and client-preview:
verification status, availability recency, listing completeness, agent record, and text/geo
relevance. **Payment influences ranking only through explicitly labelled, capped, Verified-only
featured slots.**

Sub-1.5 s results come from GiST indices on geography, GIN on the text vector, and a partial
index over active-and-verified listings, which is the overwhelming majority of queries because
the Verified filter defaults on.

---

## 8. Backend

Required from v1.0 — full detail in `07-BACKEND-SPEC.md`. Node/NestJS, PostgreSQL + PostGIS,
S3 + CDN, Redis, a transcoding pipeline, and a human-review console.

**The human-review console is a first-class product surface, not an internal script.** Listing
integrity, authority documents and scam reports all route through people, and the throughput of
that queue is a hard constraint on how fast Keys can grow.

---

## 9. Testing

| Layer | Approach | Gate |
|---|---|---|
| Domain package | Unit + property-based (Verified-status rules, cost calculation, tenancy transitions) | ≥ 95% |
| **Verified-status rules** | **Property-based: no input combination yields Verified unless all seven conditions hold** | **Release blocker** |
| **Perceptual hashing** | Adversarial corpus: resize, recompress, crop, watermark, flip, colour-shift | **Release blocker: detection rate threshold** |
| **Geotag capture** | Signature verification; injected-upload rejection; mock-location detection | **Release blocker** |
| Media pipeline | Transcode output verified against size and start-time budgets | Every RC |
| Web SEO | Rendered HTML asserted to contain listing content; structured data validated | Every RC |
| E2E | Maestro on mobile, Playwright on web, both in CI | All P0 |
| Devices | Low-end Android, mid Android, current Android, iPhone SE 2, current iPhone, desktop and mobile web | Every RC |

---

## 10. Key Risks

| Risk | Mitigation |
|---|---|
| **Too few listings at launch** | Accepted and planned for. The wedge (scam registry) is valuable at zero inventory. Verification is never relaxed to close a volume gap — that would destroy the only differentiator |
| Agents bypass geotagged capture | Device-signed captures, injected-upload rejection, mock-location detection, human review on geo mismatch |
| Perceptual hashing evaded | Multi-algorithm (dHash + pHash), adversarial corpus in CI, human review on near-threshold matches, stock-corpus screening |
| **Defamation exposure from scam reports** | Mandatory human review, evidence requirement, right of reply with a 7-day window, expiry at 24 months, resolution path, and **only upheld reports published** |
| Human-review queue becomes the bottleneck | Review console is a first-class surface; throughput measured; city-by-city rollout paced to review capacity |
| Video costs dominate | Aggressive transcoding, CDN, data-saver default on metered connections, 3-minute cap |
| Overclaiming verification scope | "Authority to let, not title" stated on every listing page and in verification copy; legally reviewed |
| Scope creep into escrow or rent collection | Explicit non-goal; no payment integration exists; recording is not collecting |
