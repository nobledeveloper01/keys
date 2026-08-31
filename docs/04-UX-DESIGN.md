# Keys — UX & Design System

**The design problem is credibility.** Every renter arrives having been lied to by a product that
looked exactly like this one. The interface has to earn belief in a category where belief has
been systematically destroyed — and it has to do that without ever overclaiming, because a broken
promise here costs someone a month's salary.

---

## 1. Principles

**1. Show the evidence, not the badge.** "Verified" alone is a word any portal can print. Keys
shows *what was verified, how, and when* — one tap away, always.

**2. Total cost, always.** The headline rent is the least useful number in Nigerian rental
search. Every price is accompanied by what it actually costs to move in.

**3. Recency is a first-class fact.** "Confirmed available 2 days ago" is more valuable than any
photograph. It appears on every card.

**4. Never imply protection we do not provide.** Keys verifies; it does not guarantee, insure, or
indemnify. The copy is careful about this everywhere, because the alternative is a legal and
ethical failure.

**5. Fewer, better.** Keys will show fewer results than the portals. The design leans into that
rather than hiding it — a short list of real properties is the product.

---

## 2. Colour

Restrained and document-like. A property product that looks like a marketing brochure reads as a
portal, and portals are what the user distrusts.

| Token | Light | Dark | Use |
|---|---|---|---|
| `surface` | `#FFFFFF` | `#0E1113` | Background |
| `surfaceDim` | `#F4F5F6` | `#181C1F` | Cards |
| `outline` | `#DCE0E3` | `#272D31` | Dividers |
| `textPrimary` | `#0E1316` | `#ECEFF1` | Body |
| `textSecondary` | `#5C666D` | `#9AA4AB` | Labels |
| `accent` | `#0E5C4A` | `#3FA98C` | Primary action. Deep green — trust, not excitement |
| `verified` | `#0E5C4A` | `#3FA98C` | Verified badge |
| `unverified` | `#6E7A81` | `#8B959B` | **Neutral grey — not red.** Unverified is not an accusation |
| `caution` | `#9A6410` | `#D9A03F` | Reported number warning, stale availability |
| `flagged` | `#A32B22` | `#E0736A` | Upheld scam report |
| `fresh` | `#0E5C4A` | `#3FA98C` | Confirmed within 3 days |
| `ageing` | `#9A6410` | `#D9A03F` | Confirmed 4–10 days ago |

**`unverified` is grey, deliberately.** Many honest listings are unverified simply because the
agent has not completed a step. Colouring them as danger would be unfair and would push agents
away from the platform they need to join.

---

## 3. Typography

**Inter** for interface, **Source Serif** for tenancy documents — agreements and condition
records should look like documents, because they are.

| Style | Size / Line | Use |
|---|---|---|
| `display` | 32 / 38 | Price on a listing page |
| `headline` | 24 / 30 | Screen titles |
| `title` | 18 / 24 | Card titles |
| `body` | 16 / 24 | Default |
| `label` | 14 / 20 | Metadata, badges |
| `caption` | 12 / 16 | Confirmation recency, fee breakdown lines |
| `document` | 15 / 24 serif | Agreements, condition records |

---

## 4. Screens

### Renter
| Screen | Purpose |
|---|---|
| `HomeScreen` | Search entry **plus the scam-lookup field, prominent** — the wedge is on the home screen |
| `LookupScreen` | Check a number or name. **No account** |
| `LookupResultScreen` | Reports, categories, dates, right-of-reply responses |
| `SearchScreen` | Filters; **Verified only defaults on** |
| `ResultsScreen` | Cards with price, total cost, badge, agent tier, confirmation recency |
| `MapSearchScreen` | Area boundaries and pins |
| `ListingScreen` | Walkthrough first, then evidence, then cost breakdown, then contact |
| `EvidenceScreen` | **What was verified, how, and when** |
| `CostBreakdownScreen` | Every fee, itemised, totalled |
| `InspectionRequestScreen` | Times, plus the declared fee policy restated |
| `InspectionOutcomeScreen` | Did it match? |
| `ReportListingScreen` | Category and evidence |

### Agent
| Screen | Purpose |
|---|---|
| `VerificationScreen` | Tier progress, next step, what each tier unlocks |
| `CreateListingScreen` | Guided; the Verified checklist is visible throughout |
| `CaptureScreen` | **On-site geotagged capture**, with distance-to-address feedback live |
| `WalkthroughScreen` | Guided video recording with room prompts |
| `AuthorityScreen` | Landlord co-verification or document upload |
| `MyListingsScreen` | **Each with its expiry countdown** |
| `ConfirmAvailabilityScreen` | **Per listing. No bulk action** |
| `LeadsScreen` | Enquiries and response times |

### Landlord & tenant
| Screen | Purpose |
|---|---|
| `PortfolioScreen` | Properties, tenancies, rent status |
| `TenancyScreen` | Agreement, schedule, receipts, tickets, condition records |
| `AgreementScreen` | Serif document view, e-signature |
| `RentScheduleScreen` | Due dates, recorded payments, receipts |
| `MaintenanceScreen` | Tickets with photos and status history |
| `ConditionRecordScreen` | Room-by-room capture, both-party acknowledgement |
| `MoveOutCompareScreen` | **Move-in and move-out side by side, per room** |

---

## 5. Signature Patterns

### 5.1 The evidence panel
The Verified badge is never a bare label. Tapping it opens:

> **What we checked**
> ✓ Agent's identity — government ID and face match, 12 March
> ✓ Authority to let — **the landlord confirmed this agent**, 3 April
> ✓ Photos taken at the property — captured on site, 40 m from the address, 3 April
> ✓ Video walkthrough — 1m 20s
> ✓ Photos are not used in any other listing
> ✓ Availability confirmed **2 days ago**
>
> *We verified this agent may let this property. We did not verify who owns it.*

That last line is the most important sentence in the product. It is precise about the limit of
the claim, and it appears every time the claim is made.

### 5.2 The confirmation-recency chip
Every card carries it: **"Confirmed 2 days ago"** in `fresh`, **"Confirmed 8 days ago"** in
`ageing`. It answers the question that actually matters — *is this still available* — before
price, before photographs, before location.

### 5.3 Total cost, always
Every card shows two numbers:

> **₦2,500,000** /year
> **₦3,150,000** to move in

Tapping expands the breakdown: rent, agency 10%, agreement 10%, caution ₦150,000. Fee stacking
becomes visible at the point of browsing rather than at the point of signing, which is the only
point at which it can influence a decision.

### 5.4 Walkthrough first
The listing page leads with the video, not a photo carousel. Photographs can be recycled;
a walkthrough of a specific flat, with its specific damp patch and its specific view, is
substantially harder to fake and immediately more informative.

Below the video, in order: confirmation recency, evidence panel, total cost, then details, then
contact. **Contact is last on purpose** — the user should have everything needed to decide
whether to spend money before there is a button that leads to spending it.

### 5.5 The lookup on the home screen
The scam lookup is not buried in a menu. It is a field on the home screen:

> **Checking an agent?**
> *Paste their number — we'll tell you if they've been reported*

It is the wedge, it works with no account and no inventory, and putting it first signals what the
product is about before the user has seen a single listing.

### 5.6 The expiry countdown
An agent's listing carries a visible countdown: **"Expires in 3 days — confirm it's still
available"**. One button, on that listing, doing exactly one thing.

**There is no confirm-all.** The friction is deliberate and the UI does not apologise for it: the
confirmation is an assertion about a specific property, and making it cheap would make it
meaningless.

---

## 6. Empty, Offline & Error States

**Few results is not an error, and the copy owns it:**

> **6 verified places match your search.**
> That's fewer than other sites would show you — because we've checked these are real and still
> available. [ Also show unverified listings ]

**No scam reports found:**

> **No reports for this number.**
> That doesn't mean it's safe — it means nobody has reported it here. Still insist on seeing the
> property before paying anything.

Precise about the limit of the claim, in the state where overclaiming would be most tempting and
most harmful.

**Offline:** saved listings and **all tenancy documents** remain available. Search says plainly
that it needs a connection.

**Listing removed while viewed:** "This listing was taken down — the agent didn't confirm it was
still available." Explains the mechanism, which builds confidence in it.

---

## 7. Motion, Accessibility & Copy

Motion is restrained — 200 ms, `easeOutCubic`. Video is the only rich media and it earns its
weight. Reduce-motion honoured; autoplay respects both reduce-motion and data-saver.

**Accessibility.** 48 dp targets. WCAG AA both themes. 200% text scaling. Full screen-reader
labelling including video described by its duration and room coverage. Colour never sole meaning.
Web meets the same bar with keyboard navigation throughout.

**Copy is precise, never salesy, and never promises safety.**

| Instead of | Write |
|---|---|
| "100% verified and safe!" | "We checked this agent may let this property. We didn't check who owns it" |
| "₦2.5m/year" | "₦2,500,000/year · ₦3,150,000 to move in" |
| "Listing expired" | "The agent didn't confirm this was still available, so we removed it" |
| "No results" | "6 verified places match. Fewer than other sites — because we checked" |
| "Agent verified ✓" | "ID verified 12 March · Landlord confirmed authority 3 April" |
| "Report submitted" | "Thanks. We review every report before publishing it, and we give the other person a chance to respond. Usually 2–3 days" |
