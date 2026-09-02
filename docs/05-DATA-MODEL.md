# Keys — Data Model

Mobile: SQLite via `op-sqlite`. Web: IndexedDB. Server: PostgreSQL 16 + PostGIS.
Media in S3 behind a CDN. All three clients sit behind one repository interface.

---

## 1. Entities

```
User ──┬── AgentProfile ── VerificationDocument
       ├── LandlordProfile
       └── RenterProfile

Property ──┬── Authority (agent ⇄ landlord)
           └── Listing ──┬── ListingMedia ── ImageHash
                         ├── AvailabilityConfirmation (fact)
                         ├── ListingReport (fact)
                         └── Enquiry ── Inspection (fact)

Tenancy ──┬── Agreement
          ├── RentSchedule ── RentPayment (fact)
          ├── MaintenanceTicket ── TicketEvent (fact)
          └── ConditionRecord (fact) ── RoomCondition

ScamReport (fact) ── ReportReview ── RightOfReply
```

---

## 2. Listing Integrity Tables — the core

### `listings`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `property_id` / `agent_id` | uuid | |
| `type` | enum | flat, self-contained, duplex, bungalow, room, shop, office |
| `bedrooms` / `bathrooms` | int | |
| `area_sqm` | int? | |
| `location` | geography(Point) | |
| `address_public` | text | street or estate only — **shown before contact** |
| `address_exact` | text | **released only on engagement** |
| `rent_kobo` | bigint | |
| `agency_fee_kobo` / `agreement_fee_kobo` / `caution_fee_kobo` / `service_charge_kobo` | bigint | **each stored separately** |
| `total_movein_kobo` | bigint | **generated column** — cannot drift from its parts |
| `inspection_fee_policy` | enum | `none` · `refundable` · `non_refundable` |
| `inspection_fee_kobo` | bigint? | |
| `payment_terms` | enum | annual, biannual, quarterly, monthly |
| `available_from` | date | |
| `status` | enum | `draft` · `pending_review` · `active` · `expired` · `suspended` · `let` · `withdrawn` |
| **`is_verified`** | bool | **server-computed only; never client-writable** |
| `verification_failed_reasons` | text[] | which of the conditions are unmet |
| `last_confirmed_at` | timestamptz | **drives expiry and the recency chip** |
| `expires_at` | timestamptz | `last_confirmed_at + 14 days` |

Indices: GiST on `location`; GIN on the text vector; **a partial index on
`(status='active' AND is_verified)`** — the overwhelming majority of queries, because the Verified
filter defaults on.

`total_movein_kobo` is a generated column precisely so that a displayed total can never disagree
with the fees it is made of.

### `listing_media`
`id, listing_id, kind (photo|video|tour_360), storage_key, order_index,`
**`captured_in_app bool`, `capture_location geography?`, `capture_device_signature text?`,**
`capture_distance_m int?`, `mock_location_suspected bool`, `duration_seconds int?`,
`renditions_json`, `uploaded_at`

`capture_device_signature` is the evidentiary field. It is produced on-device at shutter time
with a key held in Keystore/Keychain and verified server-side. **A photograph injected into the
upload path without passing through in-app capture cannot produce a valid signature**, and
therefore cannot satisfy condition 3 of Verified status.

EXIF location is deliberately **not** trusted or used — it is trivially forged. Location comes
from the signed capture record.

### `image_hashes`
`id, media_id, dhash bigint, phash bigint, computed_at, source (client|server)`

- **BK-tree indexed** for sub-linear Hamming-distance search across millions of images.
- Two algorithms, because dHash is fast and pHash is robust to different transformations;
  defeating both simultaneously is materially harder than defeating either.
- Hashes are retained for **expired, rejected and withdrawn listings too**. An image recycled from
  a listing that was deleted two years ago in another city is exactly the case this must catch.
- `source` distinguishes the client's advisory hash from the server's authoritative one.

### `image_hash_matches` — fact
`id, new_media_id, matched_media_id, distance, algorithm, decision (blocked|review|cleared),
reviewed_by?, reviewed_at?`

Every match is recorded, including cleared ones — a pattern of near-threshold matches across an
agent's portfolio is itself a signal.

### `availability_confirmations` — fact
`id, listing_id, confirmed_by, confirmed_at, method (explicit_action), ip_hash`

`method` is an enum with exactly one value, which is intentional. It documents in the schema that
confirmation can only ever be a deliberate per-listing action — **there is no bulk-confirm path
and no incidental confirmation.**

### `authorities`
`id, property_id, agent_id, landlord_user_id?, proof_type (landlord_co_verification|
authorisation_letter|management_agreement|direct_landlord), document_key?,
status (pending|verified|rejected|revoked), verified_at?, revoked_at?, expires_at?,
reviewed_by?`

Revocation cascades: setting `revoked_at` unpublishes every dependent listing in the same
transaction. **The document is never exposed to renters** — only `proof_type` — because
authorisation letters carry landlords' personal data.

---

## 3. Scam Registry — defamation-sensitive by design

### `scam_reports` — fact
| Column | Notes |
|---|---|
| `id` | |
| `reporter_id` | **Never returned to any client, including to the reported party** |
| `reported_phone_hash` / `reported_name_normalised` | the lookup keys |
| `reported_user_id` | nullable — the reported party may not be on Keys |
| `category` | `fake_listing` · `inspection_fee_scam` · `property_already_let` · `impersonation` · `undisclosed_fees` · `no_show` |
| `description` | |
| `evidence_keys_json` | screenshots, receipts |
| `status` | `submitted` · `under_review` · `awaiting_reply` · `upheld` · `not_upheld` · `insufficient_evidence` · `resolved` · `expired` |
| `reply_deadline_at` | submission + 7 days |
| `published_at` | **null unless `upheld`** |
| `expires_at` | `published_at + 24 months` |

**`published_at` is null unless the status is `upheld`.** The lookup query filters on
`published_at IS NOT NULL`, which means an unreviewed accusation is structurally incapable of
appearing publicly — not merely policy-forbidden.

### `report_reviews` / `rights_of_reply`
```
report_reviews:  id, report_id, reviewer_id, decision, reasoning, evidence_assessment,
                 reviewed_at
rights_of_reply: id, report_id, responder_id, response_text, evidence_keys_json,
                 submitted_at, published bool
```
The reply is published alongside the report, always. A one-sided published accusation is neither
fair nor defensible.

---

## 4. Tenancy

### `tenancies`
`id, property_id, landlord_id, tenant_id, agent_id?, start_date, end_date,
rent_kobo, payment_frequency, deposit_kobo, status (pending_signature|active|ending|ended|
terminated), agreement_key?, signed_by_landlord_at?, signed_by_tenant_at?`

### `rent_schedule` / `rent_payments`
```
rent_schedule: id, tenancy_id, due_date, amount_kobo, status (upcoming|due|paid|overdue|waived)
rent_payments (fact): id, schedule_id, amount_kobo, paid_at, method_note,
               RECORDED_BY landlord_id, receipt_key, acknowledged_by_tenant_at?
```

**`recorded_by` is a landlord, never a payment processor.** There is no `transaction_id`, no
`provider`, no `settlement_status` — the absence of those columns is the schema stating plainly
that **Keys does not handle money**. Recording is not collecting.

### `maintenance_tickets` / `ticket_events`
```
tickets:       id, tenancy_id, raised_by, category, description, photo_keys_json,
               priority, status, created_at, resolved_at?
ticket_events (fact): id, ticket_id, actor_id, from_status, to_status, note?,
               photo_keys_json?, occurred_at
```
Append-only event history. Tickets are **not deletable** — the record surviving is the point of
the feature.

### `condition_records` / `room_conditions` — fact
```
condition_records: id, tenancy_id, kind (move_in|move_out), captured_by,
                   landlord_ack_at?, tenant_ack_at?, completed_at, pdf_key
room_conditions:   id, record_id, room_label, photo_keys_json, capture_location,
                   captured_at, notes?, condition_rating
```

**Immutable once both parties acknowledge.** The move-out comparison joins the two records on
`room_label`, which is why room labels are constrained rather than free text. This one table pair
is what ends the most common tenancy dispute in the market.

---

## 5. Verified Status — computed, never stored as an opinion

`listings.is_verified` is derived, server-side only, from `VERIFIED_CONDITIONS` in the domain — the seven in FRD §3.4, plus `costs_stated` (phase 4) and `nobody_found_it_missing` (phase 5):

```
is_verified =
     agent.tier >= 'id_verified'
 AND authority.status = 'verified' AND authority.revoked_at IS NULL
 AND EXISTS(media WHERE captured_in_app AND signature_valid AND capture_distance_m <= 200)
 AND EXISTS(media WHERE kind='video' AND duration_seconds >= 30)
 AND NOT EXISTS(image_hash_matches WHERE decision='blocked')
 AND last_confirmed_at > now() - interval '14 days'
 AND NOT EXISTS(open upheld report against listing or agent)
```

Recomputed on: media upload, authority change, agent tier change, availability confirmation,
report resolution, and on a scheduled sweep for the time-based condition.

`verification_failed_reasons` is populated on every recompute so the agent is always told exactly
which condition is unmet and what to do about it — the mechanism should be legible, not opaque.

**No API endpoint accepts `is_verified` as an input.** A modified client cannot claim it.

---

## 6. Retention & Privacy

| Data | Retention |
|---|---|
| Active listings | Until expired/let, then archived 24 months |
| **Image hashes** | **Indefinite** — cross-time recycling detection depends on it |
| Listing media | 24 months after delisting, then originals purged, hashes kept |
| Upheld scam reports | 24 months from publication |
| Non-upheld reports | 12 months, **never published**, retained for pattern detection only |
| Verification documents | Account life + statutory period; encrypted; access-logged |
| Tenancy documents | **7 years** — they are legal records |
| Condition records | 7 years |
| Messages | 24 months |

**Privacy invariants, enforced at the query layer:**
- `scam_reports.reporter_id` is never returned to any client, in any role.
- Verification documents are never returned to a counterparty — only the derived tier.
- `listings.address_exact` is released only after engagement; public queries return
  `address_public` only.
- Media EXIF is stripped on upload; capture location comes from the signed capture record, never
  from EXIF.
- A landlord's contact details are never exposed on a public listing page.
