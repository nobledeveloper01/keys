# What v1.0 is

**Status:** the scope v1.0 ships at. Written 2026-09-02, after counting.

## Why this document exists

Fifteen release gates were open and one was closed. Six of the fifteen had been
added in the previous two days — *by the work*, not by discovering old debt. The
pattern was visible once it was counted: build the shape of a feature, log a gate
for the half that needs a vendor, move on. `MediaStore` with no bucket. Featured
placement with no payment. Right of reply with no SMS.

Each of those is defensible alone. Together they were a launch that recedes, and
nine of the fifteen could not be closed by any amount of writing code — they
needed somebody to sign a contract, buy a service, or provision a machine.

So this document does the only thing that actually shortens the list: **it says
what v1.0 is without any of them.**

## The principle

> **Where v1.0 has no vendor, Keys does the work by hand — and the product says
> so.**

Not a stub, not a mock, and not a feature quietly disabled. A person at Keys
telephones the landlord, looks at the ID document, and records what they found
under their own name. That is slower, it does not scale, and it is *exactly* what
the roadmap already committed to when it said **"Lagos-only launch paced to
review-console capacity."**

This is not a downgrade of the verification standard. Every condition behind
Verified still has to be met and the evidence is still evidence — a landlord who
confirms on a phone call to a named reviewer has confirmed. What changes is who
carries the message, and the record says which it was.

## What ships

### Listings, search, and Verified — in full

All nine conditions. Nothing about the badge is relaxed; ADR-0004 and the phase-4
gate hold exactly as written.

**Landlord authority is confirmed by telephone.** A reviewer calls the number the
agent gave, asks the question the SMS would have asked, and records the answer.
The evidence is a `landlord` attestation like any other, with the reviewer named
on it. A landlord withdraws the same way: they telephone Keys.

**Identity is checked by a person.** A reviewer looks at the document and records
what they saw. The `vendor` attestor becomes Keys' own review rather than
Smile ID's API, and the attestation says which.

### The tenant side — in full

Search, the evidence panel, costs, saved places, messaging with deferred contact
exchange, inspections, outcomes. None of it needs a vendor.

### Reports — collected and acted on, **not published**

This is the real cut, and it is the one worth arguing about.

Reports are taken, reviewed by a person, and they still cost an agent their tier
and take listings down. What does **not** happen at v1.0 is *publishing an upheld
report about a named person* — the registry lookup answers "nothing upheld" and
nothing else.

Two reasons, and either alone is sufficient:

1. **No lawyer has read the policy.** Publishing an accusation about a named
   party in Nigeria is the legally exposed act in this entire product. R3 has
   said so since phase 1 and it is not a gate that a schedule can move.
2. **The right of reply cannot be delivered.** Nobody may be publicly accused
   without a chance to answer, and with no SMS provider Keys cannot reach them.
   The system already fails closed here — an unreplied report cannot be upheld
   past its window — so this is making a real constraint explicit rather than
   inventing one.

The Check tab still exists and still tells the truth. It says fewer things.

### Paid placement — not at v1.0

`featured_until` stays in the schema and the band stays in the code, because both
are already written and both are proved. Nothing sells one. A product with three
hundred listings has nothing worth advertising against, and the first version of
a trust product taking money for placement is the wrong first version.

## What that does to the gates

| Gate | Was | Now |
|---|---|---|
| R1 right of reply delivered | blocks v1.0 | **blocks published reports**, which are out of v1.0 |
| R3 Nigerian lawyer | blocks public launch | **blocks published reports** — unchanged, and now not on the v1.0 path |
| R6 KYC vendor | blocks v1.0 | **closed by hand** — a reviewer checks the document |
| R7 SMS received | blocks v1.0 | **blocks v1.1** — landlord confirmation is a phone call at v1.0 |
| R12 outbox addresses a phone | blocks v1.0 | **blocks v1.1**, with R7 |
| R13 buy a paid slot | blocks v1.0 | **blocks v1.1** — nothing sells one |
| R15 storage bucket | blocks v1.0 | **blocks v1.1** — one machine, one disk, said out loud |

Seven gates leave the v1.0 path. **Not one of them was closed by pretending.**
Each is either done by hand, or the feature it gates is out of scope.

## What still blocks v1.0

Four, and they are all real:

- **R2** — a reviewer doing the job against real reports, which is the only way to
  know the console works. More urgent now, not less: at v1.0 reviewers *are* the
  KYC vendor and the SMS provider.
- **R4** — an Android build somebody has watched succeed.
- **R16** — the same on Android. iOS is done (R8, closed): tokens are in the
  Keychain, verified across a restart, with no fallback — so an Android phone
  refuses to open an account rather than quietly keeping one in a file.
- **R11 / R14** — a photograph taken on a real phone, at a real property,
  accepted as a capture. Until then every listing's "photograph" is a 40×32
  greyscale grid, and `capture_on_site` is a condition met by an artefact nobody
  can look at.

**R9 followed the reports out.** Universal links carry the reply link and the
landlord confirmation link; at v1.0 the first does not exist and the second is a
telephone call. It gates nothing on this path.

Three of those four need a physical device or a person. That is the honest shape
of what is left, and it is a much shorter list than fifteen.

## What this costs

Keys launches slower than it can serve. Every agent onboarded costs a phone call
and a document review, so the ceiling is however many a small team can do in a
week — which is the correct ceiling for a product whose entire claim is that
somebody checked.

The alternative was a launch date that moved every time a feature was built.
