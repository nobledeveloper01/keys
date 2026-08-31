# Keys — Functional Requirements Document

Scope: P0 behaviour. **MUST** / **SHOULD** / **MAY** per RFC 2119.
Platforms: Android 8+, iOS 14+, Web. Behaviour identical unless a divergence is stated.

> **Governing rule.** No listing may be presented as **Verified** unless every condition in §3.4
> holds. No amount of payment, agent tier, or operational pressure may create an exception. The
> Verified badge is the entire product.

---

## 1. Accounts & Access

### FR-1.1 Anonymous use
- Search, filter, view listings, watch walkthroughs, and **use the scam registry lookup** **MUST**
  all work with no account.
- An account **MUST** be required only to: contact an agent, request an inspection, apply, submit
  a scam report, or use tenancy features.

### FR-1.2 Registration
- Phone + 6-digit OTP. Role selected at signup: renter, agent, or landlord. A single account
  **MAY** hold multiple roles.
- Renters **MUST NOT** be required to verify identity to browse or contact.

### FR-1.3 Contact privacy
- An agent's phone number **MUST NOT** be exposed on a listing page.
- Contact **MUST** begin in in-app messaging. Numbers are exchanged only after mutual engagement,
  or when the agent chooses to disclose.
- Rationale: an exposed number moves the conversation to WhatsApp, outside every safety mechanism
  the product provides, and removes the record that makes a later scam report provable.

---

## 2. Agent Verification

### FR-2.1 Tiers
| Tier | Requirements | Capability |
|---|---|---|
| `unverified` | Phone only | **Cannot publish a listing** |
| `id_verified` | Government ID + liveness face match | May publish; listings can reach Verified |
| `business_verified` | Above + CAC + verified office address | Appears in agent search; higher listing limits |
| `established` | Above + 6 months tenure + 10 completed lets + no upheld reports | Priority ranking; visible badge |

- Tier **MUST** be enforced server-side.
- Tier **MUST** be displayed wherever the agent appears — listing card, listing page, message
  thread, profile, and search results.

### FR-2.2 Identity
- ID capture **MUST** use in-app camera with document edge detection and a legibility check.
- Liveness **MUST** be an active check (motion or challenge-response), not a still selfie.
- Face match against the ID **MUST** meet a documented confidence threshold; below it, the case
  **MUST** route to human review rather than auto-rejecting.
- Rejected verifications **MUST** state a reason and permit one resubmission before a cooling
  period.

### FR-2.3 Public profile
An agent's public profile **MUST** show: tier, member since, active listings, completed lets,
median response time, **upheld** scam reports, and coverage areas.
- **Reports that were not upheld MUST NOT be displayed.** Unreviewed accusations are defamatory
  and must never be public.

---

## 3. Listings

### FR-3.1 Creation
Required: type, bedrooms, bathrooms, area, address, price, payment terms (annual/biannual),
**all fees stated separately**, availability date, description, photographs, and — for Verified —
a video walkthrough.

### FR-3.2 Fee transparency
- The listing **MUST** state, separately and before contact: annual rent, agency fee, agreement
  fee, caution/legal fee, service charge, and **the inspection fee policy**.
- The app **MUST** compute and display a **total move-in cost**.
- A listing that does not declare its inspection-fee policy **MUST NOT** be published.

### FR-3.3 Proof of authority
A listing **MUST** carry one of:
| Proof | Verification |
|---|---|
| `landlord_co_verification` | Landlord confirms via OTP link. **Strongest; preferred** |
| `authorisation_letter` | Uploaded, human-reviewed |
| `management_agreement` | Uploaded, human-reviewed |
| `direct_landlord` | Lister is the verified landlord |

- The proof **type** **MUST** be visible to renters. The **document itself MUST NOT** be.
- A landlord **MUST** be able to revoke authority at any time, which **MUST** immediately
  unpublish every listing depending on it.

### FR-3.4 Verified status — the definition
A listing is **Verified** only if **all** hold:
1. Agent is `id_verified` or above.
2. Proof of authority is present and current.
3. At least one photograph was **captured in-app, on-device, geotagged within 200 m of the stated
   address**.
4. A video walkthrough of at least 30 seconds is present.
5. Perceptual hashes show no match against any other listing, past or present.
6. Availability was confirmed within the last **14 days**.
7. There is no open upheld report against the listing or the agent.

- Losing any condition **MUST** immediately remove Verified status.
- **A non-Verified listing MUST NOT be purchasable into prominence** — featured placement is
  Verified-only, at any price.

### FR-3.5 Geotagged capture
- At least one photograph **MUST** originate from in-app capture with location recorded at
  capture time.
- Where the geotag is more than 200 m from the stated address, the listing **MUST** route to human
  review rather than auto-publishing as Verified.
- **Web upload alone MUST NOT satisfy this requirement.** This is a deliberate platform
  limitation: a Verified listing requires that a person physically stood at the property.

### FR-3.6 Duplicate detection
- Every uploaded image **MUST** be perceptually hashed and compared against all existing listing
  images, active and expired.
- A match above threshold **MUST** block publication and route to human review.
- Matches **MUST** be detected across agents, across cities, and across time — recycling a
  photograph from a Kano listing onto a Lagos listing is the exact behaviour this catches.
- Images **MUST** also be screened against known stock-photography sources.

### FR-3.7 Expiry — non-negotiable
- Every listing **MUST** expire **14 days** after its last availability confirmation.
- The agent **MUST** be prompted at 11, 13 and 14 days.
- Confirmation **MUST** be a deliberate action stating the property is still available. It
  **MUST NOT** be satisfiable by merely opening the app or editing an unrelated field.
- An expired listing **MUST** leave search entirely.
- **There MUST NOT be any bulk "confirm all listings" action.** Each confirmation is per listing,
  because the whole point is a deliberate assertion per property.

### FR-3.8 Reporting
- Any user **MUST** be able to report a listing: doesn't exist · already let · wrong details ·
  agent demanded an undisclosed fee · suspected fake.
- A report **MUST** suspend Verified status pending review where the category is `doesnt_exist`
  or `suspected_fake`.
- Review outcomes **MUST** be recorded and **MUST** affect the agent's record only when upheld.

---

## 4. Search

### FR-4.1 Behaviour
- Filters: area, price range, bedrooms, bathrooms, type, furnishing, payment terms, amenities.
- **The "Verified only" filter MUST default to ON.** The user may turn it off; the default is the
  product's position.
- Results **MUST** return in under 1.5 s.
- Each result **MUST** show: price, total move-in cost, Verified badge, agent tier, and **when
  availability was last confirmed**.

### FR-4.2 Ranking
- Ranking **MUST** consider: verification status, availability recency, listing completeness,
  agent record, and relevance.
- **Ranking MUST NOT** consider payment except through the explicitly labelled featured slots,
  which are Verified-only and visually distinguished as paid.
- Featured slots **MUST** be capped as a proportion of any result page.

### FR-4.3 Total cost
- Total move-in cost **MUST** be computed and displayed on every card and page, with the
  breakdown expandable.
- Rationale: the headline rent is the least useful number in Nigerian rental search, and
  displaying it alone is what allows fee stacking to stay invisible until it is too late.

---

## 5. Scam Registry

### FR-5.1 Lookup
- Lookup by phone number or agent name **MUST** work with **no account**.
- Results **MUST** show: number of **upheld** reports, categories, most recent date, and whether a
  right of reply was given.
- Results **MUST NOT** show: reporter identity, or any report not yet upheld.

### FR-5.2 Submission
- A report requires an account and **MUST** include a category, description, and evidence
  (screenshots, receipts, message excerpts).
- Reports **MUST NOT** be published on submission. **Human review is mandatory.**

### FR-5.3 Review & right of reply
- Review **MUST** assess evidence sufficiency before publication.
- The reported party **MUST** be notified and given **7 days** to respond before publication,
  except where a pattern of corroborated reports justifies expedited publication.
- The response **MUST** be published alongside the report.
- Outcomes: `upheld` · `not_upheld` · `resolved` · `insufficient_evidence`. **Only `upheld`
  publishes.**

### FR-5.4 Expiry & resolution
- Upheld reports **MUST** expire after 24 months.
- A reported party **MUST** be able to submit evidence of resolution, which if accepted marks the
  report `resolved` and reduces its prominence.
- Rationale: a permanent, unappealable public accusation is neither fair nor legally defensible.

### FR-5.5 Automatic warning
- Where a listing's contact matches a number with upheld reports, the app **MUST** warn the user
  before they contact, stating the count and the most recent date.

---

## 6. Inspection & Tenancy

### FR-6.1 Inspection
- A renter **MUST** be able to request an inspection with proposed times.
- The **declared inspection-fee policy MUST** be shown at the moment of request, not only on the
  listing.
- After an inspection the renter **MUST** be prompted to record the outcome: matched the listing /
  differed / property didn't exist / agent didn't show.
- A `didn't exist` outcome **MUST** immediately suspend the listing's Verified status pending
  review.

### FR-6.2 Agreement
- The digital tenancy agreement **MUST** be generated from a legally reviewed template with
  jurisdiction-appropriate terms, and **MUST** be e-signed by both parties.
- The signed document **MUST** be stored in both parties' document vaults and **MUST** be
  exportable as PDF.
- The app **MUST** state plainly that Keys is not providing legal advice and that parties may
  seek their own.

### FR-6.3 Rent
- A rent schedule **MUST** be generated from the agreement.
- Reminders **MUST** fire at 30, 14 and 7 days before due.
- The landlord **MUST** be able to **record** a payment as received and issue a receipt.
- **Keys MUST NOT process, hold, or transfer any payment.** Recording is not collecting, and the
  UI **MUST NOT** imply otherwise.

### FR-6.4 Maintenance
- A tenant **MUST** be able to raise a ticket with photographs, category and description.
- Status: `open` → `acknowledged` → `assigned` → `in_progress` → `resolved` → `closed`, each
  transition timestamped and attributed.
- Both parties **MUST** see the full history. Tickets **MUST NOT** be deletable — the record is
  the point.

### FR-6.5 Condition record
- Move-in and move-out records **MUST** be captured room by room with photographs, timestamped
  and geotagged.
- **Both parties MUST acknowledge each record.**
- At move-out the app **MUST** present move-in and move-out side by side, per room.
- The record **MUST** be immutable once acknowledged and exportable as PDF by both parties.
- Rationale: this single feature ends the most common tenancy dispute in the market.

---

## 7. Media, Performance & Offline

### FR-7.1 Media
- Photographs **MUST** be compressed to ≤ 400 KB at upload; originals retained server-side for
  hashing and audit.
- Video walkthroughs **MUST** be transcoded to adaptive bitrate (HLS), capped at 3 minutes,
  targeting ≤ 15 MB at the lowest rendition.
- Playback **MUST** start within 3 s on a 3G connection.
- **Data-saver mode MUST** disable autoplay, load thumbnails only, and require an explicit tap
  before any video streams.

### FR-7.2 Performance
| Metric | Requirement |
|---|---|
| Search results | < 1500 ms |
| Listing page interactive | < 1200 ms |
| Video start on 3G | < 3000 ms |
| Cold start | < 2000 ms |
| App size | < 40 MB |
| Perceptual hash on device | < 500 ms per image |
| Crash-free sessions | > 99.5% both platforms |

### FR-7.3 Offline
- Saved listings **MUST** be viewable offline with cached photographs.
- **All tenancy documents — agreement, receipts, condition records — MUST be available offline.**
  A tenant in a dispute needs their agreement at the moment of the dispute, not when the network
  returns.
- Search and messaging require a network; the app **MUST** say so plainly rather than showing an
  indefinite spinner.

---

## 8. Legal, Privacy & Safety

- **Keys verifies authority to let, not title or ownership.** This **MUST** be stated on every
  listing page and in verification copy. Overclaiming has legal consequence.
- **Keys is not a guarantor.** The product **MUST NOT** imply protection against loss.
- **Keys handles no money.** No escrow, no rent collection, no deposit holding. Stated plainly.
- Scam reports are defamation-sensitive: mandatory human review, evidence requirement, right of
  reply, expiry, and resolution — all mandatory, all P0.
- Reporter identity **MUST NOT** be exposed to the reported party or to any user.
- Verification documents **MUST** be encrypted at rest, access-logged, and **MUST NOT** be visible
  to any counterparty — only the derived tier.
- Exact addresses **MUST NOT** be exposed publicly before contact; listings show the street or
  estate, and the precise address is released on engagement.
- All traffic TLS 1.2+ with certificate pinning on mobile.
- Users **MUST** be able to export and delete their data.
