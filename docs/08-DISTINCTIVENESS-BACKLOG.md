# Thirty things that would make Keys hard to copy

The roadmap already covers the product's *table stakes* — verification, search,
messaging, tenancy. This is the other list: the things that would make somebody
who has used Keys unwilling to go back, and that a competitor with more
listings and more money could not simply add in a sprint.

**The test each one had to pass to be on this list:** it has to follow from
something true about renting in Nigeria that the incumbents have decided not to
care about. Anything that is merely a good feature in general is not here.

The ordering inside each phase is by *leverage per week*, not by ambition.

---

## Phase 1 — the registry (now)

Cheap, and they compound the wedge before there is a marketplace to attach to.

### 1. The check is a link, not an app
A lookup result already has a URL. Give every result a share sheet that produces
`keys.ng/0803…` with an image card — because the actual moment of use is a
WhatsApp group where somebody says *does anyone know this agent*. The product
spreads through the exact channel the scam spreads through.

### 2. Answer the question by SMS
The person most at risk of an inspection-fee scam has the least data. A
short-code that takes a number and replies with the standing costs almost
nothing and reaches the people the app never will.

### 3. Tell the reporter what happened to their report
Nobody reports twice into silence. A reporter who gave a phone number gets one
message when their report is decided, either way — including when it is not
upheld, with the reason. This is the single cheapest thing on this list and it
is what makes the second report exist.

### 4. "Nothing found" is a subscription, not a dead end
Offer to notify a checker if that number is ever upheld later. It converts the
most common and least satisfying result into a reason to come back, and it
builds a demand signal the registry can be measured by.

### 5. A public, dated transparency report
Reports received, upheld, dismissed, median time to decision, and the queue
depth — published monthly on the site, from the same endpoint the console
reads. A registry that publishes its own error rate is making a claim the
incumbents cannot copy without publishing theirs.

### 6. The reply is a right, not a form
The reported party gets a callable number and a written reply, not just a
textarea. Most people accused of something want to *talk to a person*, and the
seven-day window is worth nothing if the only way to use it is typing.

---

## Phase 2 — verification and authority

### 7. Verification is a portable credential
An agent who has been verified gets a signed, expiring badge they can post on
Facebook Marketplace and Jiji — where they actually advertise. It carries a
scan-back to their Keys profile. This puts Keys' name on listings that are not
on Keys.

### 8. Rank agents by outcomes, not by profile completeness
Every incumbent ranks by how much the agent filled in. Keys ranks by inspections
that produced a let, and shows it. It is the one number an agent cannot buy and
the one a renter would want.

### 9. Landlord-side verification, not just agent-side
The landlord who co-verifies gets their own thin account, showing who is
letting in their name. Landlords being defrauded by their own agents is the
half of this market nobody serves.

### 10. Tier changes are events, not states
When an agent's tier drops, everyone who has an open enquiry with them is told.
A verification system that silently downgrades is a verification system nobody
finds out about in time.

### 11. Say what a tier does not mean
Every badge links to a plain-language page saying exactly what was checked and
what was not. Overclaiming is the failure mode of every trust badge on the
internet, and refusing to do it is a position competitors would have to match by
weakening their own.

---

## Phase 3 — listing integrity

### 12. The evidence panel
Every listing shows *why* it is verified: when the photos were taken, how far
from the stated address, whether the images have appeared elsewhere, who
confirmed authority. Not a badge — the workings. This is the whole product made
visible.

### 13. Recycled photographs get named, not just blocked
When an image matches one seen before, say where and when. "These photographs
were used in a Lekki listing in March by a different agent" is a sentence no
portal will print about its own inventory.

### 14. The camera refuses, and says why
In-app capture that will not proceed when it is too far from the address, or the
location is mocked, and explains which. An agent standing at the property gets a
clear path; one at home gets a clear no.

### 15. A listing's age is on its face
Not "posted 3 days ago" — *confirmed available 3 days ago*, with the expiry
counting down. The single most common lie in Nigerian property listings is that
the property is still available.

### 16. Video walkthroughs with a continuity check
One unbroken take, timestamped, with the same geo-signature as the stills. Cuts
are where the other flat gets spliced in.

---

## Phase 4 — search and discovery

### 17. Total cost, not rent
Rent, agency fee, agreement fee, caution deposit, service charge — one number, up
front, before the inspection. The inspection-fee economy exists because the real
number is hidden until you are standing in the flat.

### 18. Filter by what is actually asked for
"No agency fee", "landlord direct", "monthly payment accepted", "one year not
two". These are the terms every Nigerian renter negotiates and no portal filters
by.

### 19. Commute by the route people take
Not straight-line distance. Danfo and keke routes, at the hour people actually
travel. Distance in Lagos is a time measurement, not a length one.

### 20. Show the listings we rejected
A count, per search: *nine listings matched and were not shown, because they
could not be verified*. It makes the smaller inventory into evidence rather than
a weakness.

### 21. Save a search and be told when the market moves
Not just new listings — price changes, and the same property reappearing at a
different price under a different agent, which is a signal worth acting on.

---

## Phase 5 — the marketplace loop

### 22. The inspection fee is escrowed by the agent's own tier
A Verified agent can take a fee; the fee is refundable if the outcome is *did
not exist*, and the refund is enforced by tier consequences rather than by Keys
holding money. It fixes the incentive without touching the money.

### 23. Record the outcome from the renter's phone, at the property
One tap, geofenced: *I went, and this is what I found*. The whole verification
loop closes on this one action, and it has to be trivially easy or it will not
happen.

### 24. Contact exchange is deferred and mutual
Neither side gets a number until both have agreed to an inspection. The
number-harvesting that makes agents unreachable and renters spammed is a
consequence of exchanging contacts too early.

### 25. Disputes get a record, not a resolution
Keys does not arbitrate. It records both accounts, timestamps them, and gives
each party a copy they can take to a lawyer or the police. Refusing to be a
court while being a good witness is a defensible position.

---

## Phase 6 — hardening and launch

### 26. Works at 2G, and says so
A data-saver mode with a stated page weight, tested on a throttled connection in
CI. Every competitor's site is four megabytes.

### 27. The app is under 15 MB
A hard budget, enforced by a gate. On a 32 GB Transsion with 2 GB of photos, app
size is the install decision.

---

## Phase 7 — tenancy

### 28. The condition record is the deposit defence
Timestamped, geotagged photographs at move-in and move-out, side by side, in one
document. Deposit disputes are decided by whoever has evidence, and tenants
never do.

### 29. Rent receipts that are worth something
A signed, verifiable receipt for every payment, in a form a bank or a visa
application will accept. Nigerian tenants have no payment history that anybody
recognises, and this creates one.

---

## Phase 8 — depth

### 30. Area guides written from the product's own data
Median total cost, median time to let, share of listings that failed
verification, commute times — per area, generated rather than written. It is the
one kind of content a competitor cannot copy without the underlying verification
data.

---

## What this list is not

It is not a plan to build thirty things. Several of these are one afternoon
(**3**, **15**, **20**) and several are a phase on their own (**16**, **19**,
**29**). The ordering above is the order in which each stops being premature.

**The four that would change the product most, soonest:** 1, 3, 12, 17.
