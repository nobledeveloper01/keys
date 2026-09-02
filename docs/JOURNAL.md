# Keys — Journal

What we did, and what surprised us. One entry per working session, newest
first. The surprises are the point: a journal of what went to plan is a
changelog with worse formatting.

---

## 2026-09-02 — Following the house style instead of inventing one

**Did.** Redid the README screens in the convention the sibling projects already use, checked
the web surface for drift, and found two tests failing for length rather than for truth.

### The grid I wrote was not the grid

I put six screenshots in one block at the top of the README, as `<img width="220">` with the
caption in a table cell underneath. Backhaul and Grid — the two projects in this portfolio
that have screen grids — do something different and better:

- Markdown `![alt](path)`, not HTML with a hard-coded width.
- **The caption is the table header**, so the grid reads as a labelled row rather than a
  picture with a caption bolted under it.
- Grids are *interleaved through the document* under topical headings, each followed by the
  prose explaining why the screen is that way — not lumped into a gallery at the top.

The lump-at-the-top version is what you write when the screenshots are decoration. The
interleaved version is what you write when they are the argument. Keys' README now has
"Finding a place", "Talking to an agent", "The agent's side" and "At the largest text size",
each with its grid and its reasoning.

Also added the numbers table the siblings carry — tests, faces, screens, ADRs, gates — which
gives a reader the scale in ten seconds.

### The web console had a field it never rendered

The server has sent `listingId` on a report since a report could be filed from a listing
page. The web review console never rendered it, so a reviewer judging `fake_listing` still
could not see which listing — the exact gap that was fixed server-side, still open on the
only surface that consumes it.

It shows the evidence panel inline now, fetched through the same proxy as everything else.
My first attempt linked to `/listing/{id}`, **a route that does not exist on web** — written
by me, in the same hour I finished a gate for documents that name routes the server does not
serve. The gate does not read TSX.

Otherwise the registry pages have not drifted at all: the home page is pixel-identical to
August's capture, because nothing I built in phases 4 to 6 touched the registry.

### Two tests were failing for length

`no client can raise its own tier` and `no unreviewed report escapes` both walk *every* route
the router serves, and the router has gone from eleven routes to forty-five. Under load they
now exceed jest's five-second default.

A timeout in either of those files reads exactly like a security regression, which is the
worst possible way for a suite to be wrong. They have an explicit, generous budget now, and a
comment saying it is there to stop a false alarm rather than to measure anything.

---

## 2026-09-02 — The README was a phase-1 document

**Did.** A screen grid at the top of the README, and the rewrite that had to come with it.

### What it said

> **Phase 1 of 8. The scam registry works; nothing is deployed.**

Five phases out of date, and confidently so. "What works end to end" described the registry
and nothing else — no search, no evidence panel, no messaging, no viewings, no saved places.
"What is not built" listed phase-3 concerns as though they were next.

Two claims were not merely stale but wrong:

- *"The landlord confirms the agent by OTP"* — at v1.0 that is a reviewer telephoning them
  and recording what was said under their own name. The texted code is written and waiting
  on a provider.
- *"Android 8.0+, iOS 14+, **and web at v1.0**"* — which contradicts `V1-SCOPE.md`, written
  the same day. Android does not open an account at all yet; it refuses rather than keeping
  a token in a plain file.

The verification section counted four mechanisms. There are six, and nine conditions.

### The grid

Six screens across the top of the README with a line under each saying what it is for. The
one at iOS's largest accessibility size is in there deliberately: a grid at the default text
size is a grid of the easy case, and that setting is what found three broken layouts.

### What this says about the drift gate

`doc-drift.py` passed the README the whole time. It checks condition counts and route names —
facts with a single mechanical source — and the README's worst claims were a phase number, a
mechanism that had changed, and a platform statement contradicting another document.

None of those has a mechanical source, and I do not think they can be given one honestly. The
gate catches what it can catch; the rest needs somebody to read the thing. What I can say is
that the two documents contradicting each other were written a day apart, which is not a
staleness problem — it is a not-looking problem.

---

## 2026-09-02 — The deck showed a product that no longer existed

**Did.** Brought the screens document up to what the app is.

### What it was showing

Seventeen screens, captured on 31 August, before phases 4, 5 and 6. No Find tab, no listing
page, no costs, no messaging, no saved places, no agent property screen. **Seven of the
seventeen were web** — the surface that had been explicitly set aside as not the product.

So the visual record of Keys was a registry lookup and a web page, which is what Keys was in
August and is now the second tab.

### Seven screens added

Find, the cost breakdown, the evidence panel, Messages, asking about a place, the agent's own
account, and one at iOS's largest accessibility size. The captions say *why* each screen looks
the way it does, which is the only reason to bind screenshots into a document rather than hand
somebody a folder.

The accessibility screen is in there deliberately. A deck of screenshots at the default text
size is a deck of the easy case.

### A layout fault the deck has always had

Every screen spanned two pages, with its caption orphaned overleaf under a fragment. `.shot
img { width: 100% }` on A4: a phone screenshot is about one to two, so a full-width image is
taller than the page, and `page-break-inside: avoid` cannot hold together an element that does
not fit. Bounded by height instead — 33 pages became 26, one per screen with its caption
under it.

### Smaller

`pngquant` is not on this machine, so the first three captures went through the `sips`
fallback twice and came out 276 px wide against the deck's 414. Recaptured at one consistent
size. The fallback is fine; running it twice is not, and nothing said so — the files just
looked small.

---

## 2026-09-02 — The specification described a product that had moved

**Did.** A documentation pass, starting with a gate so that fixing it once means something.

### What the gate found

`scripts/doc-drift.py` asks a question `doc-check.sh` does not: not whether a document exists
and is tracked, but whether what it *says* is still so. Only facts with a single mechanical
source — the number of Verified conditions, the routes the server actually serves. Prose about
why is not checkable and is not checked.

Seven documents claimed seven or eight conditions. There are nine.

### The worst of it was not a number

`07-BACKEND-SPEC.md` had a background-jobs table with an entry reading *Verified recompute —
on any input change + hourly sweep*. That is not stale, it is **the architecture the product
deliberately rejected**: nothing about a listing's status is stored, so there is nothing to
recompute, and a listing that loses its badge is gone from the very next search rather than
the next sweep. Phase 4's exit gate fails on a cache, including one refreshed hourly.

A document promising an hourly sweep is worse than one that is silent, because somebody
writes code that waits for it. Of the seven jobs that table planned, none exists.

The endpoint list had the same shape of error: eleven endpoints marked as built when
forty-five existed, and several planned under names that were built differently or replaced
by another mechanism. A hand-kept mirror of a generated fact is a second source of truth, and
this one had been wrong for four phases. It says the *shape* now — who may call what, and
why — and points at `openapi.json`, which `api-fresh` already keeps honest.

### A test that misreported what it did

`listings.test.ts` announced "all 128 combinations agree with the conditions they broke". Its
loop derives the bound from `SWITCHES.length`, so it had been running 512 since the eighth
condition landed — the test was right and its name was two conditions out of date, and the
failure message would have printed the wrong number at the moment somebody needed it. The
count comes from `SWITCHES` now.

### And the gate could not fail, in half of itself

The route check matched nothing. Its regex excluded a `/v1/...` preceded by a backtick, which
is how every document in this repo writes a route — so a deliberately broken document passed
the route half in silence while the condition half caught its planted error. Found by breaking
it on purpose, which is the only reason I know either half works.

Eleventh instance, and the one I should be least surprised by: I wrote the checker and the
break in the same hour, and only the break told me.

### What is deliberately not checked

`JOURNAL.md` and `CHANGELOG.md` are exempt. A journal entry saying "seven conditions" was true
when it was written and is part of the record; rewriting it would falsify the history the
journal exists to hold. ADR-0001 was edited rather than exempted, because its count was
incidental to the decision it records — the argument does not turn on there being seven.

---

## 2026-09-02 — Looking at it at 310%

**Did.** The accessibility audit phase 6 named and this repo's definition of done demands:
*200% text scaling without truncation — check it, do not assume it.* Nobody had checked.

### The screen reader could not read the evidence panel

`Progress` renders the nine Verified conditions. The tick is an SVG with no text and the row
had no label, so VoiceOver announced "ID check", "Landlord confirmation", "Photo at the
property" — **with no indication of which were met**. The entire content of that page is
which ones are ticked. It was invisible to anybody not looking at it.

Each row is one accessibility element now, saying the state in this app's own words in the
reader's own language. Not `accessibilityState={{ checked }}`, which announces as a tick box:
these rows are not interactive, and telling somebody they can toggle what Keys has verified
would be worse than saying nothing.

### Three layouts broke at the largest size, and none of them truncated

At `accessibility-extra-extra-extra-large` the tab bar wrapped to three lines per label and
took forty per cent of the screen. Listing titles truncated to "Two bedroom flat, Ya…" —
which could be Yaba or anywhere. And the costs card collapsed: the figure claimed its full
width and the label column shrank to a sliver, so "Higher than the usual ten per cent" came
out one word per line beside a ₦250,000 with the rest of the screen to itself.

That last one is the instructive failure. **Nothing was truncated and nothing overflowed**, so
a check that greps for ellipses would have passed it. It was simply unreadable, and only
looking found it.

Fixes: tab labels shrink to fit one line rather than wrapping; titles and addresses take two
lines because they are *content* and content must not truncate; cost rows stack label-above-
figure past 1.5× because there is no container query in React Native and two columns stop
fitting.

### The thing I got wrong, and what caught it

I found `MAX_SCALE` with every entry `undefined` and called it a mechanism somebody had built
and never populated. I filled it in: `title: 1.8`, `body` uncapped.

That is the exact inversion `type-scale-stays-ordered.test.ts` was written to catch, described
in its own doc comment, in those words — a capped title renders *below* the uncapped body it
introduces. The empty record was a decision, tested, with the reasoning written down, and I
read it as an oversight because it looked like one.

The test was the only thing that said so, and it said so immediately.

The real fix is a per-call `maxScale` on `Text`, used by the tab bar alone. It applies to one
call site rather than to every use of a variant, so five tab labels sharing a cap invert
nothing against each other — and a tab label is not part of the reading hierarchy of the page
behind it.

**What this says about reading a codebase:** an unpopulated table looks identical to a
deliberate one. The difference was a test file I had not opened, holding the reasoning. I
should have looked for who depended on it before deciding it was unfinished.

---

## 2026-09-02 — The token is in the Keychain

**Did.** R8, closed on iOS and watched: a Keychain module, both sessions moved into it, and
the old copies swept out of the app container.

### What it was

`AsyncStorage` — a plain file inside the app container on iOS. Fine for a language choice
and not fine for a bearer token that lets somebody publish listings under an agent's name:
readable on a jailbroken phone, present in an unencrypted backup, available to anything with
file access. It was written down as a release gate the day it was introduced, with the note
that no agent account should reach a real phone until it moved, and then it sat there for
five phases while I cited it in comments as the counterexample.

### The choices inside the Keychain

`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`, and both halves matter.
`AfterFirstUnlock` rather than `WhenUnlocked` because an agent's phone that reboots in their
pocket should not sign them out. `ThisDeviceOnly` because a session token has no business
riding an iCloud backup onto a handset the agent may no longer own.

No Face ID prompt, deliberately. A biometric check on every request would make somebody
standing in a flat with one bar wait for a face scan to upload a photograph, and the failure
that actually happens here is a lost or stolen phone, which `ThisDeviceOnly` plus revocation
answers.

### No fallback, and that is the whole point

The tempting shape is: Keychain if present, `AsyncStorage` if not. That makes every platform
work and makes this gate *look* closed while the exact thing it names carries on happening
wherever the module is missing.

So `available()` says whether a token can be kept, and a phone that cannot keep one refuses
to open an account and says so in Settings. Android fails that way today — which is worse
for Android and honest about which. It is R16 now, not a footnote in a closed gate.

That decision propagated: `signIn` returns a boolean and both sign-up paths read it. A screen
showing an account over a token that was never stored has produced a session that vanishes on
the next launch with nothing to explain it.

### What surprised us

**`TurboModuleRegistry.get` returned null for a module that was in the binary.** `get` is the
method whose signature says "null when absent", which is exactly what this needed — and it
resolved nothing, next to two modules registered the same way that resolve fine. These are
legacy `RCT_EXTERN_MODULE` modules reached through the bridgeless interop layer, and that
layer is consulted on the *enforcing* path. So: `getEnforcing` in a try/catch, with the catch
as the platform check. Half an hour, and the second time this codebase has lost time to how
these modules are reached rather than to what they do.

**My migration left the token behind on every launch after the first.** It read the Keychain,
found the token already there, and returned early — never deleting the file copy. The write
and the delete are not one operation: a phone killed between them, or one failed delete,
would keep a readable token in the container for ever while the function reported success.
It sweeps on every launch now, which is cheap and is the only version that converges.

I found that by looking at the file rather than by trusting the screen. The screen said
"Kept in the phone's secure storage", which was true, and told me nothing about whether the
old copy was gone.

---

## 2026-09-02 — Counting the list instead of adding to it

**Did.** Stopped building surface. Counted the release gates, found the pattern, and cut
v1.0 to what ships without a vendor.

### The count

Fifteen open, one closed. **Six of the fifteen added in the previous two days** — not by
discovering old debt, by the work itself. Nine of the fifteen could not be closed by writing
any amount of code: they needed somebody to sign a contract, buy a service, or provision a
machine.

The ledger's own header had predicted this, in phase 1:

> If it grows past what one screen holds, the product is being built past the point anybody
> can honestly ship it.

It grew past one screen and nobody looked, including me. I had been reporting the list as a
single thing — "here is what is left" — when it was two things, and only one of them was
mine.

### The pattern, named

Build the shape of a feature. Log a gate for the half that needs a vendor. Move on.
`MediaStore` with no bucket. Featured placement with no payment. Right of reply with no SMS.
Each defensible alone; together, a launch that recedes as fast as it is approached.

### The cut

`docs/V1-SCOPE.md`. **Where v1.0 has no vendor, Keys does the work by hand, and the product
says so.** A reviewer telephones the landlord and looks at the identity document. Published
reports and paid placement leave v1.0 entirely — the first because no lawyer has read the
policy and the right of reply cannot be delivered, the second because a product with three
hundred listings has nothing worth advertising against.

Seven gates left the v1.0 path. **Four remain**, and three of them need a physical phone or
a person: an Android build, a reviewer doing the job, the Keychain, and a photograph taken
on a real phone.

### Not one of them was closed by pretending

That was the thing to get right. "We will do it manually" is one sentence away from "we will
skip it", so the manual path is real code with its own guards:

- A new `Attestor` variant, `{ kind: 'keys', reviewer, saw }`. Not `vendor` with the word
  "keys" written into a free-text field nobody validates — an API reference and a person's
  recollection are different kinds of evidence and the row says which.
- **The reviewer is named or the attestation is refused.** Every other reviewer route falls
  back to a reviewer called `unattributed`; for a decision that is tolerable, because the
  decision is still recorded. Here it is not — at v1.0 this row is the *only* evidence a
  check happened, and evidence attributed to nobody is what ADR-0006 refuses.
- **What they saw is mandatory and twenty characters.** "Checked" is not an account of
  anything.
- The tier ladder is untouched. `tierOf` reads the *kind* of evidence, not who attested it,
  so a check by hand climbs the same rung and no rung got easier.

### What surprised us

**The database refused the first row.** `evidence_attestor_matches_kind` pairs each evidence
kind with the attestor allowed to produce it, and it had never heard of `keys`. The
constraint was right and I had forgotten it existed. Rewritten rather than dropped: that
pairing is what stops a landlord "confirming" an identity, and losing it to add a row type
would be paying for a feature with a guarantee.

**My own test could not fail, again.** The unattributed-reviewer refusal was unreachable
because `beforeAll` set `KEYS_REVIEWERS` and never unset it — so the assertion guarding the
most important new rule in the file was decorative. Tenth ADR-0004 instance, and the third
this week in a test I wrote the same hour.

---

## 2026-09-02 — A saved copy does not get to say Verified

**Did.** Offline saved listings, and the rule that decides what one is allowed to claim.

### The interesting part is not the storage

Keeping a listing on the phone is an afternoon's work. What took the thinking is that
**Verified is computed on every read**, from evidence that changes between one read and the
next — a landlord withdraws, a reviewer blocks an image, somebody goes to the address and
finds nothing. Phase 4's whole gate is that nothing is cached and nothing can be behind.

A saved copy is, by definition, behind.

The tempting version is a one-line change on a screen: render the `verified` boolean that
was true when it was stored. That is how a badge nobody re-checked ends up in front of
somebody standing outside a flat that was delisted yesterday.

### So: never, at any age

`mayShowBadgeOffline()` returns `false`. Not "false when it is old" — false for a copy saved
thirty seconds ago.

A badge means *Keys checked this and stands behind it*, and a phone with no signal has
checked nothing. Thirty seconds versus thirty days is not a difference in what the app
knows, only in how likely it is to be wrong, and a claim that is probably right is exactly
the kind this product refuses everywhere else.

It is a function rather than a comment so that a screen asking the question gets an answer
instead of a judgement call.

What a saved copy *does* say: the address, the price, and **"What Keys had checked when you
saved this"**, with an age in words, and a sentence underneath — *Keys cannot check this
again until you have signal, so it does not say whether it is still checked.* The row in the
list carries a grey dot, never a green one.

The age boundary is `CONFIRMATION_DAYS`, and not by coincidence: a Verified listing is one
somebody confirmed within the fortnight, so a copy older than that is older than the freshest
claim the live product would have made about it.

### The gate caught me one turn after I built it

`phrase-check` failed on `nothing_saved_yet` and `nothing_saved_yet_help` — an empty state I
wrote words for in four languages and then gave nowhere to appear, because the Saved chip
only exists when there is something saved. Written yesterday to catch exactly this, and the
first thing it caught was me.

### Two things the screenshots showed

**The listing page rendered the saved copy and a "we cannot reach Keys" panel underneath
it.** Two accounts of the same situation, the second blunter than the explanation written
for it.

**The "Checked places only" chip stayed lit above the saved list.** A filter about a live
search, sitting over a list of copies — saying Keys had filtered them to checked places,
which is the claim the card on each of those pages spends a paragraph carefully not making.

### Where it is stored

`AsyncStorage`, and here that is right rather than a compromise. Nothing in it is a secret:
it is a copy of pages public to anybody with the app — the exact opposite of the session
token two files away, which is under a release gate for being in the same place.

---

## 2026-09-02 — The roadmap asked for the wrong thing

**Did.** Made search fast without letting it answer any of the questions it was making fast.

### Postgres FTS and PostGIS were both wrong

The roadmap said "Postgres FTS + PostGIS" and both turn out to be mistakes, for the same
reason, and it is a reason this repo has already paid for twice.

**PostGIS would be a second implementation of distance.** `ST_DWithin` and `metresBetween`
are two functions answering *is this within 200 m*, and this codebase's whole history is two
implementations of one rule disagreeing invisibly — `assessListing` exists because of it,
and the Postgres captures store rebuilds a BK-tree per query rather than repeat it.

**Full-text search would be a second implementation of matching.** `matches()` requires every
typed word as a *substring*, so "yab" finds Yaba. A `tsvector` matches lexemes, so "yab"
finds nothing — and the in-memory store and the durable one would return different sets for
a query somebody is halfway through typing. Every suite here runs against both stores
precisely so that passing in memory is evidence about production; that premise dies the
moment they disagree.

Stemming is also wrong on its own merits: `to_tsvector('english', 'Ikeja')` is guessing at
the morphology of a Yoruba place name.

### So: SQL narrows, the domain decides

ADR-0008. A trigram GIN index over the same two fields `matches()` reads, queried with
`ILIKE '%word%'` — which has *exactly* the substring semantics the domain has, so the index
makes the existing rule fast instead of replacing it. A bounding box that is a superset of
the radius, with `metresBetween` still deciding what is inside it.

The rule for anybody extending this, and it is the whole ADR: **a SQL predicate may only
remove rows the domain would also have removed.** If it can remove a row the domain would
have kept, it is not narrowing — it is a second opinion.

The test asserts the superset property rather than an expected list: for a set of queries,
every listing the domain would keep is in what the store handed back. That is a property
that stays true as the fixtures change, and it fails under all three ways of getting this
wrong — lexeme matching, a box that drops unplaced listings, and a predicate on the badge.

### The line that matters most

**Nothing narrows on verification.** SQL may narrow on what a listing *says* — its words,
its coordinates — never on what Keys *concluded*. Adding
`last_confirmed_at > now() - interval '14 days'` to the query is the tempting version: it is
correct today, it is fast, and it fails every assertion in the file. Phase 4's gate exists
because that answer is recomputed on every request and must never be cached anywhere,
including inside a WHERE clause.

### Smaller things

**The bounding box is deliberately too big.** A degree of longitude shrinks towards the
poles, so the box is computed from the *furthest* edge rather than the centre. A box a few
metres too wide costs a handful of rows; a box a few metres too narrow silently loses a
result nobody can tell is missing, and that asymmetry decides which way to be wrong.

**A listing with no coordinates stays in a near-me search.** It cannot be ranked by
closeness, but dropping it in SQL would hide every unplaced listing from anybody who shared
their location — a decision the domain never made and nobody asked for.

**The in-memory store ignores the hints entirely**, and that is a correct implementation. The
contract asks for a superset; everything published is a superset. Reimplementing the
narrowing there would be a second place for "which listings might match" to be decided.

**A test believed it had published something.** It created a listing under an invented
`propertyId`, which `publishListing` silently refuses because no landlord confirmed that
property — so the assertion was about a draft. The guard was right; the fixture was wrong.

---

## 2026-09-02 — There were no photographs

**Did.** Object storage, and the signature change it forced.

### What a capture was

A 40×32 greyscale grid. That is all. Enough to compute a perceptual hash, enough for every
gate in this codebase to pass, and not enough for anybody to *look at the flat*. The evidence
panel has been saying "Photo at the property — ticked" about an artefact no tenant could
ever see.

### Adding a photograph is a signature problem

The interesting part is not the bucket. Until now `sha256` in the signed claim *was* the
grid's hash, because the grid was the capture. With real media there are two artefacts doing
two different jobs, and it turns out both have to be inside the signature:

- Sign only the photograph and the grid is free. Duplicate detection reads the grid, so an
  agent could pair a stolen picture with a grid they invented — recognisably somebody else's
  flat, hashing to something Keys has never seen.
- Sign only the grid and the photograph is free to be swapped for anything at all.

So `keys.capture.v3` carries both, and `gridSha256` is the literal `nogrid` when absent
rather than an empty field — empty fields inside a signed message are how two different
claims come to sign the same bytes.

Each half is proved separately: bind only the grid and the swapped-photograph test fails;
bind only the photograph and the swapped-grid test fails.

### Content-addressed, and that is not an optimisation

The storage key is the SHA-256 of the bytes, which is the same hash inside the signature. A
stored object cannot be swapped for different bytes without the key changing, so there is no
path where what is served is not what was signed. A uuid would have needed a column saying
which hash it was supposed to be, and a column can be wrong.

It also makes the cache header true rather than a gamble: `immutable`, a year, because bytes
under that URL cannot ever be different bytes.

### The hole in the serving route

Content addressing has a consequence worth stating: a key from one listing is a valid key
everywhere. Without checking that the hash belongs to *this* listing, anybody holding one
could pull the photograph through whichever published listing they liked — including one
whose own images a reviewer had blocked. There is a test for it and it fails when the check
goes.

### No default directory

`FilesystemMediaStore` began with `root = process.env.KEYS_MEDIA_DIR ?? '/tmp/keys-media'`,
which is exactly the failure the captures store spent this whole project having: something
that looks like it worked until the machine is replaced. There is no default now. A
deployment that has not said where media goes gets the in-memory store, which reports
`durable: false` out loud.

### What still is not real

The phone has nothing to put in the media field — `KeysCapture` emits the grid and nothing
else, so every listing's "photograph" is still a grid. The server accepts and binds media;
the camera has to produce it. R14. And there is no bucket: R15.

---

## 2026-09-01 — Every deploy un-verified the catalogue

**Did.** Gave the captures store a durable implementation. It had none.

### What was actually happening

`CapturesStore` had exactly one implementation — `InMemoryCapturesStore` — wired
unconditionally, in production as well as in tests. Every other store in this codebase
switches on `KEYS_DATABASE_URL`; this one did not, and nothing had ever noticed.

So every photograph and every walkthrough in the product lived in a process. A restart took
them, and with them `capture_on_site` and `walkthrough_video` on every listing that had
them. **A deploy silently un-verified the entire catalogue**, and each agent would have had
to walk back to their property and photograph it again.

Nothing said so. `/healthz` reports the *reports* store's durability and has no opinion about
this one. The badge is recomputed on every read, so it was simply false afterwards rather
than stale in a way anything could detect. And the suite could not see it: a test that
starts a fresh app for every run cannot notice a store that only forgets *between* runs.

I met it twice in this session — re-seeding captures after each server restart — and read it
as a demo inconvenience both times.

### The security half

Nonces lived in the same store. A restart made every previously-spent nonce spendable again,
and a signed capture plus a reusable nonce is a replay: an attacker holding one valid upload
could resubmit it after any deploy. That is now a primary key and an `ON CONFLICT DO
NOTHING`, which is one statement rather than a check and a write with a gap between them.

### The index is rebuilt per query, on purpose

Duplicate matching is a BK-tree over perceptual hashes, and a BK-tree does not live in
Postgres. The choice was between reimplementing the distance search in SQL and loading the
hashes to run the *same* `HashIndex` the memory store runs.

It does the second, at the cost of a table scan per upload. Two stores that disagree about
whether two photographs are the same picture is the failure that matters, and it is exactly
the shape of the bug that cost this codebase `assessListing`. When the scan stops being
free, the fix is a coarse SQL pre-filter that *narrows* the candidates before the same index
runs over them — never a second answer computed a different way.

### What surprised us

**My own restart gate could not fail, in one of three assertions.** The nonce check read
`capture_nonces` directly and asserted the row was there — which stayed true with the store
switched back to memory, because the row existed and nothing was reading it. It asks through
the store now, and checks that an unused nonce is still spendable, so it cannot pass for a
store that refuses everything either. Ninth ADR-0004 instance.

**A test had been deciding the schema.** `duplicate_pairs` takes listing ids, so its columns
are `uuid` — and a phase-4 test passed the literal `'somewhere-else'`, which the memory store
accepted happily. The tempting fix was to widen the column to `text`. The right one was to
give the test a real second listing.

---

## 2026-09-01 — Sentences for a feature that does not exist

**Did.** Started phase 6 by looking for places the app claims something it cannot do, and by
making an upload say what it will cost before it costs it.

### What was in the dictionary

Sitting in `language.ts`, in all four languages, translated and paid for:

> **"Saved on this phone. It will send when you have signal."**

There is no queue. Nothing in this app has ever saved anything to send later. Beside it,
`waiting_to_send`, and an `OfflineBanner` component wired to render *"3 waiting to send"* —
a component nothing mounted, whose doc comment was about drivers on northern corridors,
copied wholesale from a different product.

If that banner had ever been mounted it would have told somebody their listing draft was
safe, on a phone where it was already gone.

### The gate that found it

`scripts/phrase-check.py`: every phrase declared in four languages reaches a screen, or it
is a promise nobody kept. Sixteen were dead. Most were harmless leftovers from screens that
were redesigned; two were the ones above.

It has to understand phrases that are *assembled* — `condition_${c}`, `outcome_${o}` — and
the prefixes are discovered rather than listed, because a hand-maintained list of exceptions
goes stale exactly the way the thing it is checking does.

**And it has a hole, written into the file.** A phrase used only by a component that nothing
mounts counts as used — which is how `waiting_to_send` survived the first run. `wired-check`
exempts components deliberately, and the two exemptions line up to leave a gap. Named in the
source so nobody trusts the check further than it goes.

**A test went stale the same way.** `every face of the app has words` asserted six
hand-written phrase names exist, and failed when one of them was correctly deleted — a list
of what must exist, maintained separately from what exists, is a second place to be wrong.
It derives its own list now.

### Data is money here

A walkthrough video is the most expensive thing this product asks anybody to do, and data in
this market is bought in bundles that run out. So an upload says what it will cost *before*
it starts — "This will use about 4.2 MB", in the reader's language — and stops for an answer
when the connection is metered and the upload is large enough to matter.

Small things that took a moment to get right:

- **It defaults to metered.** A phone that cannot say what it is on is treated as costing
  money, because the failure that matters is spending somebody's bundle by assuming wifi.
- **The cap refuses rather than downscales.** Re-encoding somebody's evidence would make the
  signature stop matching the bytes it was taken over, and the signature is the only reason
  a capture proves anything.
- **Declining is not a failure.** It has its own outcome in the return type, because falling
  through to "No signal" would blame the network for a decision somebody made deliberately —
  and the next time they saw that message they would have no reason to believe it.
- **The question is not a system dialog.** `Alert.alert` cannot be translated by this app's
  dictionary, so the one sentence about money would have been the one sentence in English.

### And the name that ran ahead of the feature

The phrase shown on eleven screens when a request fails was keyed `no_signal_saved_here`.
Its text was honest in all four languages — "No signal", nothing more — but the *name*
described the queue. Renamed to `no_signal_nothing_sent`, which collided with an existing
`no_signal` that had different words in Yoruba and Igbo, so the new name had to say what
actually happens.

---

## 2026-09-01 — A slot, not a thumb on the scale

**Did.** Featured placement, which is the last thing in phase 5 and the one that could have
quietly falsified everything the search says about itself.

### The problem with the obvious version

This product's ranking says, in its own doc comments and on its own pages, that position
cannot be bought. The naïve reading of "featured placement" — a boost, a weight, a
multiplier — makes that sentence false. A ranking that can be bought is not a ranking, it is
a rate card, and "Verified first" stops meaning what it says the moment "and paid before
that" is also true.

So a featured listing does not rank. It sits in a separate band above the results, labelled
**"These agents paid to appear here"**, and `rank()` was never told that featuring exists —
no parameter, no field on a scored listing. That is asserted on the *signature*, because
asserting on behaviour would only prove that today's `rank` ignores an input it could be
given tomorrow.

### Four rules, three of them structural

**Verified only.** A slot must not be a way to put an unchecked listing in front of somebody
— that would be money buying exactly what the badge is supposed to mean. Lose the badge and
the band empties on the very next request.

**It must match the query.** Enforced by the shape of the function rather than by a rule
somebody has to remember: `featuredAmong` takes the *already ranked results*, so there is no
way to hand it a listing the search did not return. A paid slot cannot show a flat in Ikeja
to somebody searching Surulere.

**Capped at three.** A page that can be filled with paid slots is a page where the free
answer is below the fold.

**Never twice.** The band is taken *out of* the list underneath, so paying buys a different
position rather than two of them — and a reader scrolling past does not meet the same flat
again wearing no label, which would make the label look optional.

### What surprised us

**The response had to stop being a list.** A bare array cannot say which of its entries were
bought without a flag on each, and a flag on each is one `if` away from being sorted on.
Two fields in the wire format is what makes "the ranking cannot be bought" checkable instead
of promised. Every caller and four test files changed; that is the price and it is the right
one.

**Two Metro instances were serving different bundles.** A render error that looked like a
code fault in `FindScreen` was two processes bound to 8081. Worth writing down because the
error pointed at a library file and said nothing about the real cause.

**Restoring a deliberate break with `git checkout` reverted uncommitted work.** `featured.ts`
was untracked, so its restore silently failed and contaminated the next break; the controller
*was* tracked, so its restore threw away the change under test. Breaks now get restored from
a copy, not from the index.

**The band and the results rendered identically.** With one paid listing above three free
ones there was no line where "bought" stopped, which makes the label decorative. The free
list gets a heading — but only when something was bought, because a heading over the only
list on a screen is furniture.

### What does not exist

No payment provider, no amount, no route that sells a slot. Placements are set by hand. There
is deliberately no `paid_kobo` column sitting at zero on every row, which would read like a
feature that works. R13.

---

## 2026-09-01 — The listing nobody could report

**Did.** A report can now be about a listing rather than a number, from somebody who has
never seen a number.

### The hole the previous entry opened

Every report in this product is keyed on a phone number. That was right when the only way
to meet an agent was to be messaged by one — you have their number and nothing else.

Deferred contact exchange inverted it, and nothing noticed. A tenant who finds a listing
through search has *never seen a number*: that is what the whole mechanism is for. So they
could open a listing, read all nine conditions, decide the place was fiction, and have
nothing to press. The report screen would have asked them for a number they had no way to
know.

Reporting a listing resolves the agent's hash on the server, from data the reporter never
holds. They report a property; Keys knows whose it is; the number stays where it was.

### What surprised us

**My own gate could not fail.** The first version of "reaches the right agent" asserted the
report appeared in the reviewer queue with the right listing id — which stayed true when the
agent hash was set to `null`. A report filed against nobody passed. It asserts by consequence
now: upheld, it costs *that* agent the badge and leaves another agent's listing alone.
[ADR-0004](adr/0004-a-gate-that-cannot-fail-is-not-a-gate.md), eighth instance, this time in
a test written the same hour.

**A reviewer was being asked whether a property is fiction with no way to look at it.**
`fake_listing` has been a category since phase 1 and nothing ever carried which listing.

**`replace` wrote seven of a row's columns and dropped the rest.** In memory it swaps the
whole row; in Postgres it was an UPDATE of a subset, so the two stores disagreed about what
a write means — and every suite here runs against both precisely so that passing in memory
is evidence about production. `reply_deadline_at` is what exposed it. Nothing in the product
moves a deadline, so this is not a feature; it is the two stores telling the same story.

**Restoring a deliberate break hit the wrong line.** A `return true;` I put back landed
inside `isPublic` instead of the function I had broken — which would have published every
report regardless of status. The type checker caught it because the surrounding line
referenced a name that was not in scope. It would not have caught a break that happened to
type-check, which is an argument for restoring breaks with an anchored edit rather than a
substring.

### The third store module

`AgentsStoreModule` exists now, for the third time this shape has been needed — captures,
market, reports. Each time because two modules needed each other and Nest resolves one of
them to `undefined`, failing as a null dereference in a route far from either file. A module
that provides one thing and imports nothing cannot take part in a cycle.

---

## 2026-09-01 — The number is the last thing, not the first

**Did.** Phase 5's marketplace loop: a tenant messages an agent about a listing, they swap
numbers only if both agree, they arrange a viewing at a fee named in advance, and they say
what happened when they went. Server, domain, and the screens for both sides.

### The two halves of one question

*A stranger cannot reach an agent's number, and a stranger cannot take a listing down.*
Both are about what an unknown party may do to somebody, and both have an obvious wrong
answer that ships in most marketplaces.

The number in the advert is the wrong answer to the first. An automatic suspension only a
reviewer can lift is the wrong answer to the second — it hands anybody with an account a
way to take a competitor off the market for as long as the queue is.

### Where the number lives

Not on the account. Every phone in this product is a hash, because the only thing the rest
of the system does with one is *match* it. A hash cannot be revealed, which looked at first
like a problem for a feature whose whole job is revealing a number.

It was not. The number is supplied at the moment somebody offers it and stored on the
conversation — which is better than un-hashing an account would have been. The hashing
invariant survives everywhere else; the number shared is a decision per conversation, which
is what people actually do; a conversation nobody offered in holds no number at all; and an
offer nobody answered can be withdrawn, which sets the column to NULL rather than flipping
a flag.

### Why the suspension is safe

The remedy is evidence, not an appeal. The agent walks back to the property and photographs
it — ten minutes, no reviewer — and it is impossible for somebody who never had the flat,
because the capture is device-signed and must fall inside the radius of the coordinates
they published. It has to be taken *after* the complaint: a photograph from last week proves
the flat was there last week, which nobody disputed.

### What surprised us

**Making `capturedAt` load-bearing opened a hole the same day.** It lives inside the *signed
claim*, so the phone chooses it. One claim dated 2099, uploaded once, would have immunised a
listing against every report anybody would ever make — for ever, silently, with a valid
signature. Captures now refuse a future timestamp, with five minutes of clock skew for
phones whose clocks drift.

**`wired-check` found a comment wearing a constant's clothes.** `SUSPENSION_LIFTS_ONLY_ON_EVIDENCE
= true` was read by nothing and could not have been; `false` would have changed no
behaviour. Deleted. It also found `feeWasHonoured` unwired, which meant nothing ever
compared what was paid to what was declared — so a fee complaint whose own figures
contradict it is now refused rather than filed.

**A second Postgres suite deadlocked the first.** Both clear the schema before running, and
in parallel workers that is two `TRUNCATE ... CASCADE` racing over the same tables. It
surfaced the day a second suite existed, not the day the first was written.

**A phrase written as a label was used as half a sentence, again.** The contact-exchange
copy — "they will only see it if they share theirs" — was reused on the sign-up screen,
where it told somebody their number was on its way to an agent when it is hashed on arrival
and no agent ever sees it. A borrowed sentence that is merely awkward is a nuisance; one
that is *false in its new home* is worse than saying nothing.

**One screen serves both sides of a conversation.** The thread, the contact panel and the
message box are identical for tenant and agent; only the viewing panel differs. Two files
would have been two copies of the part that must never disagree about who may see a number
— the same duplication that put a ticked "photographed at the property" in front of one
person and nothing in front of another, and cost this codebase `assessListing` to undo.

### The gate

Four deliberate breaks, each caught by the assertion meant to catch it: one side offering
reveals the other's number; any capture lifts a suspension rather than only a later one; the
outcome route stops checking whose inspection it is; the suspension never reaches the badge.

---

## 2026-08-31 — ₦800,000 is not the price

**Did.** An eighth Verified condition: a listing says what it actually costs to move
into, or it is not Verified. Rent, agency fee, agreement fee, caution deposit, service
charge — totalled on the server, published on the listing page, and carried on every
search row.

### Why this is a verification problem and not a form field

The advert says ₦800,000. The tenant is asked for ₦1,100,000 on the day. None of the
difference is secret — it is the customary ten per cent each way, plus a deposit, plus a
service charge — it is simply never added up anywhere before somebody is standing in front
of an agent with a bank app open.

`undisclosed_fees` was already a report category here, which means this product already
treated it as a harm. This answers it before it happens rather than after.

### The odd one out, and why it still earns its place

The other seven conditions are evidence that a property and an agent are real. This one an
agent can satisfy with numbers they invented; stating a fee does not make it true.

What it buys is that a stated fee is a **claim on the record**. An agent who wrote ₦80,000
and asks for ₦200,000 at the door can be reported for it. Silence cannot be reported
against, which is exactly why silence is the norm. It is also the cheapest of the eight for
an honest agent — four numbers — and the only one a dishonest one gains by skipping.

### Silence and zero are different answers

`null` costs and all-zero costs mean opposite things: one is "we have not said", the other
is "there is nothing else to pay". The API refuses a missing field rather than defaulting
it to zero, because defaulting would invent a claim on an agent's behalf that a tenant may
later rely on. The database has a CHECK saying all five or none. And a `NO_COSTS` constant
was deleted from the domain the moment `wired-check` noticed nothing called it — it read as
"not stated" and meant "everything is free", which is precisely the confusion the whole
condition exists to prevent.

### What surprised us

**A gate we did not write caught the eighth condition.** `wired-check` flagged the unused
constant. A test asserted `toHaveLength(7)` and went stale the same day — now it asserts
against `VERIFIED_CONDITIONS` itself, because a literal in a test is a second place to
remember something the domain already knows.

**A second Postgres suite deadlocked the first.** Both clear the schema before they run, and
in parallel workers that is two `TRUNCATE ... CASCADE` racing over the same tables. It
surfaced the day a second suite existed, not the day the first was written. Serial when
there is a real database; a schema per worker is the faster answer if it ever hurts.

**`=== null` let `undefined` through and rendered ₦NaN beside a real address.** The type says
`number | null`; a response from an older server omits the field, which is neither. A price
is the one field on a row that must never be guessed at, so the check is `typeof` now and
`naira` refuses a figure that is not one.

**A phrase written as a label was used as half a sentence.** "₦1,305,000 On top of the rent"
— the capital was correct where the phrase was written and wrong where it was used. It is
lowercase in all four languages now, because it is only ever the back half.

### Proved it fires

Three deliberate breaks, each caught by exactly the assertion meant to catch it: the
condition never pushed (the badge survives an unpriced listing), a missing field defaulting
to zero (a "nothing to pay" claim invented for the agent), and search sending rent where the
move-in total belongs.

---

## 2026-08-31 — One sentence, two answers

**Did.** Search and the listing page, and the redesign that prompted them — the agent's
account is a list of properties now rather than every feature on one scroll.

### What surprised us

**The Verified answer was computed in two places and they disagreed.** The agent's own
screen measured the capture distance with `metresBetween`; the search controller copied
`distanceM` straight off the stored capture, where it is always null. So an agent saw
"photographed at the property — ticked" for a listing no tenant could find. Same listing,
two answers, and the wrong one was the one a tenant saw.

It is one function now — `assessListing` — and nothing else in the codebase may compute it.
This is the sentence the whole product sells; a second opinion about it is a bug with a
badge on.

**The redesign found the modelling error, not the other way round.** "Ask a landlord to
confirm you" always took a `propertyId`. Floating at account level it had to *ask* which
property — a form field that existed only because the screen was in the wrong place. On a
property's own screen the question is already answered and the agent types one number.

**A checklist that ticks its own instructions reads as absurd.** The first version showed
the unmet conditions as paragraphs; ticking them gave "✓ One of these images is already on
a listing we blocked", a solved problem stated as a live one. The obvious fix — a past-tense
set — is also wrong: "Your ID is checked" is a lie on an *unticked* row, so it would need a
third set. A noun phrase is true in both states, which is why checklists are written that
way.

**And then the same seven labels had two audiences.** The agent sees them on their property;
a tenant sees them on the listing page. "Your own images" is second-person to the agent and
nonsense to a tenant reading about somebody else's flat. Every label has to be true from
either side, which rules out "your" as firmly as it rules out an instruction.

### What the ranking will not do

No paid placement, no boost, no sponsored weight. Phase 5 adds featured placement and the
roadmap caps it to Verified listings — but that is a *slot*, marked as such, not a thumb on
this scale. The moment a rank can be bought, "Verified first" stops meaning what it says.

Nor recency of posting, which rewards churn: an agent who deletes and re-posts a stale
listing would beat one who kept theirs honest. What is rewarded is *confirming* a listing is
still there, which costs the same effort and means something.

The ranking says why each result sits where it does, in words. A ranking nobody can
interrogate is one somebody will assume was bought.

### The gate

Every way of losing the badge is exercised separately — the landlord withdraws, a reviewer
withdraws the ID, a reviewer blocks an image, the fortnight lapses — and each takes the
listing out of the *very next* request. Adding a cache fails it. Filtering before assessing
fails it. That is the whole claim: nothing has to re-index, so nothing can be behind.

---

## 2026-08-31 — A condition nothing could ever satisfy

**Did.** Walkthrough recording, and coordinates on listings — which closed a condition that
had been unmeetable since the day it was written.

### What surprised us

**`capture_on_site` had never been satisfiable by anybody.** It asks whether a capture was
taken within two hundred metres of the property. `provesPresence` needs a distance; nothing
knew where a property *was*; so every listing failed it no matter what its agent did. The
condition was correct, tested exhaustively in the domain, and structurally impossible in the
product. It was documented as "waiting for phase 4" and that was true — but a rule nobody
can satisfy is not the same as a rule not yet enforced, and the agent's screen had been
telling people to go and take a photo that would not have counted.

**The walkthrough duration was outside the signature.** `walkthrough_video` asks for thirty
seconds, which is the entire mechanism — it is what makes somebody walk the flat rather than
film a doorway. The duration arrived beside the signature, so a two-second clip could claim
thirty. It is inside now, which changed the message shape, which is what the `v1` prefix
existed for: `keys.capture.v2`.

**A break that passed, and the gap it revealed.** Making a missing location read as a
distance of zero — so a listing with no coordinates would count as on-site — failed nothing.
None of the tests had a listing without coordinates. A listing drafted on the bus has none,
which is the ordinary case, and it would have become Verified on a photograph taken
anywhere. There is a test now, and it fails on that break.

### Two decisions

**The distance is measured at read time, not stored on the capture.** An agent who adds
coordinates after drafting, or corrects a typo, should get a re-answer rather than carry a
distance computed against the wrong place for ever.

**A walkthrough is hashed by one frame, a second in.** The file's bytes are megabytes and
change completely on every re-encode, so hashing them would say nothing about whether two
agents are using the same footage. A frame goes through the same perceptual hash a
photograph does. One second in rather than zero, because the first frame of a hand-held
video is usually a blur of somebody's thumb.

**And `0, 0` is refused as a place.** It is in the Gulf of Guinea, about seven hundred
kilometres off Lagos — close enough to look plausible for a Nigerian product, and exactly
what an uninitialised location arrives as.

---

## 2026-08-31 — A black screen with no way out

**Did.** Forced expiry, and the camera. Phase 3's scope is now built except for object
storage.

### What surprised us

**A fourth hardcoded input.** `lastConfirmedAt: null` had been sitting in the Verified
computation alongside the three found yesterday, with the same shape of comment saying a
later slice would fill it in. A listing's confirmation date is now its own, and the
tempting shortcut — defaulting it to the publication date — is refused by a test, because
that would hand every listing a free fortnight of Verified and make the first confirmation
the one nobody ever does.

**The camera trapped the agent on a black screen, and only a simulator could find it.** The
capture controller discovered the missing camera in `viewDidLoad` and called its completion
there, which ran `dismiss` while the presentation was still animating. Nothing dismissed.
No cancel button had been laid out yet either, because the guard returned before that line.

On a phone this path never runs, so this is a bug that only exists where it is hardest to
notice you should look. The rule it produced: **do not present a screen you already know
will fail.** Whatever can be checked before presenting is checked before presenting, and the
late failure — the camera existed a moment ago and does not now — is deferred to the next
run loop so there is something to dismiss.

**And then the clean refusal was a red error overlay.** `capture()` rejects for four
ordinary reasons — no camera, cancelled, no location, the photo failed — and every one is a
sentence to show, not an exception. An uncaught rejection puts a redbox in front of somebody
standing in a flat trying to photograph it.

**The React Native template shipped an empty `NSLocationWhenInUseUsageDescription`.** It had
been in `Info.plist` since the project was created, and iOS terminates an app that requests
location with an empty string. Nothing had requested location before, so nothing had
crashed. The build warned about it the moment a real one was added beside it — two keys, the
empty one winning.

### The rule that keeps falling out of this

Twice now a pure function has had to be moved out from beside a native import — the
SHA-256, then the base64 decoder. A file whose first line is
`TurboModuleRegistry.getEnforcing` cannot be imported by a test at all, because that call
runs at *import* time rather than at first use. Both are their own modules now, and both are
held to Node's output across the padding and block boundaries where hand-written versions go
wrong.

### What is not verified, and cannot be here

A simulator has no camera. Every path except the photograph itself has been exercised — the
refusal, the permission prompt, the enclave signature, the hash, the upload. R11 is somebody
standing at a property with a phone, and it is in the ledger rather than assumed.

There is no gallery picker and there will not be one. The signature's whole claim is that
the bytes came out of this camera; a picker beside it would be a hole with a button on it,
advertised by the app itself.

---

## 2026-08-31 — The curve was chosen by the enclave, not by me

**Did.** The signing module: a P-256 key generated inside the Secure Enclave, signing there,
and a capture from the simulator accepted by the server and matched as a duplicate against
one signed by a completely separate client.

### What surprised us

**The signature scheme was wrong, and only writing the phone side revealed it.** The server
verified Ed25519 — the better modern choice, picked on that basis, tested adversarially with
fifteen assertions, all of them passing. Then the Swift went in and the assumption
underneath collapsed: **the Secure Enclave holds P-256 keys and nothing else.** There is no
`SecureEnclave.Curve25519` in CryptoKit and no way to put an Ed25519 private key in the
enclave.

Ed25519 would therefore have meant a private key in software — the Keychain at best — which
can be recovered from a device backup or a jailbroken phone. A stolen signing key is
somebody able to sign captures for a property they have never stood in, which is precisely
and only what this mechanism exists to prevent. The curve was never a free choice; it was
determined by where the key has to live, and I chose it before asking that question.

The server verifies ECDSA P-256 over SHA-256 now and there is a test that an Ed25519 device
key is refused rather than crashing a verifier handed a type it did not expect.

**Four encodings had to agree and none of them fails loudly.** `derRepresentation` versus
`x963Representation` for the public key; DER versus raw for the signature; `verify('sha256')`
versus `verify(null)`; and the claim string itself. Every mismatch comes back as
`bad_signature` — the same answer a genuine forgery gets. That is why the probe sends a real
capture through the real route rather than checking the pieces: each piece was individually
correct in the version that did not work.

**`RCT_EXTERN_METHOD(publicKeyWithResolver:...)` exports a method called
`publicKeyWithResolver`.** The JS name is the selector up to its first colon, and the spec
was calling `publicKey()`. `undefined is not a function`, from a name nothing points at.

**And a comment of mine was wrong in a way a test caught.** I put the hand-written SHA-256
beside the capture probe and wrote that importing it would not touch the native bridge. The
probe's first line is `TurboModuleRegistry.getEnforcing`, which runs at *import* time — so
the test could not run at all. The hash is its own module now, which it should have been
anyway: a pure function should be importable without starting a bridge.

### What is asserted, and what is only claimed

The hash is held to Node's across the block-boundary lengths where a hand-written SHA-256
goes wrong — a second implementation of something the server compares by equality, where one
wrong bit is `bytes_do_not_match` on a genuine capture.

**The enclave is not asserted, and cannot be.** A simulator has none; the module falls back
to a software key so the flow can be developed. That fallback is a real weakening and *the
server cannot see it* — a P-256 public key does not say where its private half lives. It
needs attestation, and until then `hasSecureEnclave()` reports it and R10 carries it, rather
than the fallback sitting in the code unmentioned.

### Deleted rather than kept warm

A `useDevice` hook, written for a capture screen that does not exist because the camera is
not written. A hook waiting for a screen nobody has designed is a guess at what that screen
will need. `wired-check` found it the same day.

---

## 2026-08-31 — The right of reply was a database column

**Did.** Deep links, so the message Keys sends opens the app; a reply screen behind them;
and the text that carries the link, which had never been written.

### What surprised us

**Phase 1 shipped a right of reply that nobody was ever told about.** There was a token, a
route that accepts it, a web page that uses it, and an exit gate asserting no unreviewed
report escapes. There was nothing anywhere that *sent* it. "The number you reported has
seven days to answer" is on the report form, in the API response, and in the copy on three
surfaces — and the person being accused received no message at all.

It passed every gate because every gate asked whether the token worked. None asked whether
it was delivered. The outbox now carries it, addressed to the reported number, and deleting
those four lines fails two tests.

**A universal link is the only shape worth sending.** `keys://reply?token=…` is a dead end
for everybody without the app — and the recipients here have just been told they are accused
of something, so a link that does nothing is not a small failure. An https link opens the
app when it is installed and the web page when it is not. That needs three things: an
entitlement, an `apple-app-site-association` file the web now serves, and a provisioning
profile this project does not have. Two of three, and R9 carries the rest.

**`import React_RCTLinking` does not resolve.** The pod is called that; the Swift module is
not. `RCTLinkingManager` lives inside the prebuilt `React.framework`, so `import React` —
already at the top of the file — was the whole answer. One failed build to learn it.

**And a placeholder that would have shipped.** The association file had
`TEAMID.ng.keys.app` in it for about a minute. That is a syntactically perfect file
describing an app that does not exist: universal links would have silently not worked, with
nothing anywhere saying why. It reads `KEYS_APPLE_TEAM_ID` and returns 503 without it, the
same way the web refuses to start without `KEYS_API_URL`.

### Two things tidied because they had grown a second copy

`PUBLIC_SITE` existed in `agents.controller.ts` and the same origin was typed into a
template string in `authority.controller.ts`. Two places to change, and the failure mode is
an SMS full of dead links sent to people who have just been accused of something. One
`links.ts` now, with the two link builders on it.

The `Outbox` lived inside `AgentsModule`, which was right while only the landlord flow sent
anything. The registry owes texts too. Its own module — one provider, no imports, so it
cannot join a cycle, the same shape the captures store needed for the same reason.

### Still open

Nobody has watched a real phone receive any of this. The outbox holds messages and there is
no provider — R1 and R7. What changed is that the messages exist and are addressed, so
connecting a provider is connecting a provider rather than building a flow.

---

## 2026-08-31 — The app could not report anything

**Did.** Reporting and settings on the phone, and a third tab. Filed a report from the
simulator and watched it arrive in the reviewer's queue.

### What surprised us

**Reporting had been web-only for two phases and nobody had said so.** A tenant could look
a number up on their phone, find nothing, get scammed that afternoon, and have nowhere in
the app to say so. The registry is only as good as what reaches it, and what reaches it
comes from people holding phones — so the one surface that could not report was the one
that matters.

It is not a tab. It is reached from the answer card, with the number carried across
normalised, because the person who reports is the person who just looked somebody up and
recognised them.

**Tapping "Send this to whoever asked" opened the report screen.** Found by accident, aiming
at one and hitting the other.

`Press` lifts layout properties onto the `Pressable` and leaves the visual ones on the
animated view inside — a split its own docstring explains at length, because `flex` and
`width` on the wrong node had already cost this project two layout bugs. Margins were in the
wrong group. A margin inside the pressable makes the gap above a control part of its touch
area, and where two of these stack, the lower one — drawn later — wins the tap over the
upper one's text.

On the lookup card that meant the wrong action from the wrong tap, on the one card in this
product where the difference is *share a result* versus *accuse somebody*. The gap between
two controls belongs to neither of them.

**Then the right link stopped working, which was the same bug wearing the other face.** With
the margins lifted, each target was exactly the height of its words — about twenty points,
against the forty-four this product holds itself to everywhere else. Both of these are one
tap from somebody who has just been scammed. `justifyContent` rather than padding, so the
words stay put and only the target grows.

**And a `?? 'fake_listing'` I wrote to satisfy the type checker.** `category` is nullable
until somebody picks one, the send button is disabled until they do, and the call site
needed a non-null value. The fallback would have filed a report under a category nobody
chose if the disabled button were ever bypassed. It returns instead. A default that invents
an accusation is worse than a button that does nothing.

### Two things closed

**R5 is cleared.** `ThemeToggle` was written in phase 0, is covered by the palette gate, and
had never once been mounted — so the dark half of a generated palette had never appeared on
a screen in this product. `wired-check` exempts components deliberately, because a design
system that had to be deleted and rewritten one screen at a time would be worse; the price
of that exemption was this, carried in the roadmap for two phases.

**The language can be changed after first run.** A phone shared between a shop owner and
their nephew is one phone with two readers, and a choice made once at installation is not a
setting.

---

## 2026-08-31 — Three hardcoded answers

**Did.** Closed the duplicate-match pipeline: a match opens a pair for review, a reviewer
blocks the copy or allows both, and a block costs the copy its badge. Driven end to end
through the real routes and the real console.

### What surprised us

**Three inputs to the Verified computation were constants I had written myself.**
`bytesMatch: true`, `blockedDuplicate: false`, `captures: []`. Each had a comment saying a
later slice would fill it in, and each one was the difference between computing an answer
and asserting one:

- `bytesMatch: true` meant the signature covered a SHA-256 of *something* and the server
  never checked the something was what arrived. A stolen photograph submitted under a
  genuine capture's paperwork passed all fifteen assertions.
- `blockedDuplicate: false` meant a reviewer blocking an image changed nothing an agent
  could see. The queue worked; the decision went nowhere.
- `captures: []` meant an agent who had done everything right was told, for ever, to take a
  photo in the app.

None of the three would have been caught by a test, because every test was written against
the same constant. What found them was wiring the thing they were standing in for.

**A signature that was correct and failed anyway.** The demo script signed a timestamp with
microsecond precision; the server parses to a `Date` and formats with `toISOString`, which
emits milliseconds. One string signed, a different one verified, and a `bad_signature` on a
capture that was entirely genuine. It cost half an hour, from a script written to exercise
this very route — which is the best possible place to learn it, and it is in the domain
docstring now for whatever signs this from outside JavaScript.

**And a module cycle, avoided by inches.** `AgentsModule` needs the captures store, because
a blocked image is one of the seven conditions. `CapturesModule` needs `AgentsModule`, for
the guard that resolves an agent token. Two modules importing each other resolve one to
`undefined` and fail as a null dereference in a route far from either file. The store is its
own module now — one provider, no imports, so it cannot take part in a cycle.

### Two asymmetries worth stating

**A pair is stored unordered; the consequence is not.** One decision settles "may these two
listings both use this picture" whichever way round it is asked. But `blocked` falls only on
whoever uploaded second — blocking the listing that had the photograph first would punish
the agent who was copied. Making `isBlocked` symmetric fails exactly one test.

**A pending match costs nobody their badge.** Only a reviewer's `blocked` reaches the
Verified computation. A listing losing its badge because nobody has got to the queue yet
would make the badge a measure of reviewer throughput.

### Still open, honestly

`capture_on_site` stays unmet even for a listing with an accepted capture, because
`provesPresence` needs a distance and nothing knows where a property *is*. The shape is
fixed without claiming the condition is met, and there is a test asserting the capture
arrives with `distanceM: null` — so this starts passing on its own the day listings carry
coordinates, in phase 4.

---

## 2026-08-31 — A whole module the gate could not see

**Did.** Wired the perceptual hashing into the capture route: bytes verified against the
hash inside the signature, hashed, matched, indexed.

### What surprised us

**`wired-check` matched `export function` and `export const`, and not `export class`.**
`packages/domain/src/hashing.ts` — the hash, the BK-tree, the duplicate policy, tested
against nine attacks — had no caller anywhere, and the gate had reported clean on every run
since it was written. It was found by grepping for its own name.

This is the seventh instance of ADR 0004 and the second inside `wired-check.py` itself. The
fix after the sixth was `scanned_nothing()`, which asks whether each root still exists —
and this root existed and was full of code. **A liveness check answers "is this rule looking
at anything". It cannot answer "is this rule seeing what is there."** The second question
only yields to breaking the guard on purpose in the shape it claims to catch, which is the
practice this repo already had for gates and had never once applied to the gate-checker.

**And wiring it exposed a `true` I had written myself.** The capture route passed
`bytesMatch: true` with a comment saying object storage would arrive later. What that meant
was: the signature covers a SHA-256 of *something*, and the server never checks that the
something is what it received. Every other assertion in that suite was about the paperwork —
and the paperwork was genuine while the file could be anything. A stolen photograph
submitted under a real capture's signature would have been accepted by all fifteen
assertions.

### Two orderings that are the whole security property

**Index after acceptance, never before.** Indexing as the grid is read is the obvious
place — the image is right there. It also lets anybody with an agent token push pictures
they never proved they took, and every honest listing that later resembles one goes to a
reviewer. Moving those four lines above the refusal gate fails exactly one test.

**Match before adding, and filter out the listing's own id.** Without the filter an agent
adding a second photograph of the same room opens a duplicate review against themselves,
which is both wrong and the fastest way to make a reviewer stop reading the queue.

### A decision about a dependency

The server decodes a raw greyscale grid with an eight-byte header, not a JPEG. `sharp` is a
compiled dependency that has to build on every machine and in every container, to do one
thing — and what a Keys capture may be is decided by the Keys camera rather than by whatever
someone found on the internet, because the signature refuses everything else. The capture
module will emit the grid alongside the encoded file. The dimensions live in the header
rather than in fields beside the signature, because those fields are outside what the device
signs and the grid is not.

---

## 2026-08-31 — The app was a phase behind, and nobody had said so

**Did.** The agent screens on the phone — sign up, ask a landlord, draft, publish, and
what each listing still needs — behind a two-tab bottom bar, driven end to end on the
simulator.

### What surprised us

**We had built a phase of a React Native product entirely in Next.js.** The agent page, the
landlord page and the review console were all web-only; the app got the tenant lookup panel
and nothing else. The repo's own pattern is web-first — there is a journal entry titled
*"Doing the web first made the app's gaps obvious"* — so it was not wrong, but web-first
only works if the app follows, and nothing in the gates asks whether it has.

**One number had two hashes.** The verification panel did not appear on the phone for an
agent who was plainly verified. Agent sign-up hashed the raw typed string; tenant lookup
hashed the E.164 form. `08099887766` and `+2348099887766` are the same number and were two
rows.

`normalise` existed twice, byte-identical, in the app and the web, and both docstrings
carried the same justification: *this is a fact about how Nigerians write phone numbers into
a text field, not a rule about reports.* That was a reasonable line while only the two
clients used it. It stopped being reasonable the moment the server started hashing phone
numbers of its own — and the server had no copy at all. It is in `packages/domain` now, and
`hashPhone` calls it, so no future caller can reintroduce this by forgetting.

**A success message that destroyed itself.** "We have queued a text to that landlord" was
set by the same handler that asked for a refresh; the refresh put the query back to
`loading`, everything below unmounted, and the message went with it. The agent saw two
cleared fields and no confirmation, which on a phone reads as a button that did not work. A
notice about an action has to outlive the component that performed it.

**"Open an accou".** The button label was clipped by a hard vertical edge. `Gradient` paints
with an SVG `<Rect width="100%">`, and a percentage inside a container whose width is being
decided *by its children* is a measurement with nothing to measure against. The disabled
variant is a plain `View` and rendered fine, which is what pointed at the gradient rather
than at the text. The plain View owns the layout in both states now and the gradient sits
behind it.

**And the double inset, again.** The tab bar reads the home-indicator inset and pads for it,
and `SafeAreaView` was applying it too — the bar sat above a strip of bare background with
the ambient gradient showing through. This app made the same mistake between `SafeAreaView`
and a screen header in phase 1 and it cost 94 points at the top. Whichever element paints to
the edge owns the inset.

### Two decisions

**Navigation is a `useState`, not a library.** The roadmap deferred a router to phase 4
because a tree drawn before its screens exist is a guess. That was right and is no longer
the situation — there is a screen a tenant uses and a screen an agent uses, and they are not
steps in a flow. The moment there is a second thing to go *back* to, in phase 4, it becomes
a router. Writing one now would be generalising from a sample of two.

**"1 properties a landlord confirmed".** The phrase tables carry no interpolation on purpose,
because word order differs across these four languages — which leaves a count beside a
plural noun as the only shape available, and English is the language that punishes it. There
is a separate singular phrase now. Hausa, Yoruba and Igbo do not inflect that noun, so their
two strings are the same sentence, which is a good argument for four tables rather than one
with a pluralisation rule.

### Still open

The agent's token is in `AsyncStorage` — a plain file on iOS, unencrypted preferences on
Android. For a language choice that is fine; for a bearer token that lets somebody publish
under an agent's name it is not. The web surface does this properly, with an httpOnly
cookie, which is exactly why the gap needed writing down rather than assuming. R8 in the
ledger, and a hard blocker on any real agent account.

---

## 2026-08-31 — Signing the claim, not the file

**Did.** Phase 3's third gate: Ed25519 verification of every capture, and fifteen
assertions that an upload which did not come out of the Keys camera is refused.

### What surprised us

**The interesting attack is not an unsigned upload.** That one is obvious and fails
immediately. The one worth building for is a *genuine* signature over *different values*:
the agent really did take a photograph, on a real registered device, with a real key — and
submits it claiming a different flat. Signature real, device real, only the coordinates
changed.

It fails because the coordinates are inside the signed message. That is the whole design
decision, and it generalises: the timestamp is in there, and so is the operating system's
mocked-location flag. Signing as mocked and sending as real is refused as a *bad
signature*, not laundered into a real capture — a flag sent beside a signature is a flag
the client can flip.

**The nonce has to be spent before anything is decided.** Claiming it only on success
leaves it spendable after any other failure, and a valid signature plus a reusable nonce is
a replay waiting to happen. It costs an honest agent a retry after a genuine error, which
is much the cheaper mistake. Moving the claim to the success path fails exactly one test,
which is how it should be.

**The refusal body was invisible to our own client.** Nest returns a plain object as the
response body, so the refusals were there — and `@keys/api` reads `detail` for every refusal
in this product. A caller that had not been specially taught about `meaning` would have
shown its own generic fallback and told the agent nothing. `detail` is now the sentences,
joined.

### Decisions worth recording

**Twelve hours of freshness, not five minutes.** An agent photographs three flats in a
morning on a phone with no data and uploads that evening. Refusing that pushes them towards
the workaround this mechanism exists to prevent. What the window is really for is bounding
how long the nonce store has to remember.

**There is no `updateKey`.** A device's public key is written once at registration and no
method replaces it. An attacker who can rotate a key can sign anything as that device, so
the absence is the security property rather than an unfinished feature. A lost phone is a
new device.

**A signature proves the path, not the subject.** It proves the bytes came out of the Keys
camera on this agent's device at a stated place and time. It does not prove they were
photographing their own flat — a camera can be pointed at a printout. That is what
perceptual hashing is for, and keeping the two defences separate is what stops either one
being asked to do a job it cannot.

### Still open

The phone side. The key belongs in the secure element and the TurboModule that generates it
does not exist, so nothing signs anything outside the tests. The server refuses everything
until it does, which is the correct direction to be incomplete in.

---

## 2026-08-31 — The corpus was testing the fixture

**Did.** Phase 3's first two gates: the seven-condition Verified rule, exhaustive rather
than sampled, and an adversarial hashing corpus.

### What surprised us

**Twelve synthetic rooms all matched each other.** The first generator varied a window
and a door slightly over a shared gradient. Eleven of the twelve pairs were inside the
match threshold — and the instinct, for a good few minutes, was that the threshold was
too loose. It was not. A difference hash reads a nine-by-eight thumbnail, so what
distinguishes two images *to it* is their brightness pattern at roughly one-eighth scale,
and rooms built from a gradient and three big rectangles have almost none. The fixture
could not have tested what it was written to test. Rebuilt around a coarse block pattern
at exactly the scale the hash reads, the closest two rooms sit 21 bits apart.

**A 6% crop defeated the hash, and the fix was not a looser threshold.** Twelve of
sixty-four bits, on a third of the images. Loosening buys crop tolerance with false
matches on honest listings, which is the expensive mistake — a false match takes somebody's
income off the market. Each image is now indexed under two hashes, the whole frame and its
middle, so a cropped copy's frame resembles the original's middle. Deleting the second
hash fails the gate.

**A comment claimed something that was false.** `resize` averages over a box, and the note
above it said that is what makes the hash survive a shift. Replacing the average with a
sampler broke nothing, which prompted a shift test — and the shift test failed with the
average still in place. Nothing can make a difference hash shift-invariant; content moving
across the frame moves between columns whatever the filter does. What averaging actually
buys is stability under compression noise, and that only shows at an amplitude worth
having: at ±8 the two filters are indistinguishable, at ±70 — a photo that has been through
WhatsApp twice — the sampler fails and the average holds. The claim is proven now instead
of asserted, and the source says what a shift really costs: three bits at one pixel, nine
at four, sixteen at eight.

### Decisions worth recording

**`isVerified` is defined as "nothing unmet".** Not a chain of `&&` beside a separately
built reasons list — those two drift the first time somebody adds a condition to one of
them, and the result is a listing that is Verified while the page explains why it is not.
The gate asserts, over all 128 combinations, that the named reasons are exactly what was
broken.

**A hash match never blocks anything on its own.** `verdictFor` returns `pending`, never
`blocked`. The same photograph legitimately appears on two listings when an agency changes
hands or a flat is re-let a year later, and auto-blocking on distance takes an honest
agent's listing down with no person involved and nobody to appeal to.

**The agent is told all seven, including the ones we cannot check yet.** In-app capture does
not exist, so those conditions can never be met today — and reporting only the answerable
ones would send an agent to do two things and find the badge still missing. Five unmet, all
five named, each with a next action.

### Still open

A horizontal flip is not caught, and there is a test asserting that it is not, so the hole
cannot quietly become a surprise. Gate 3 — rejecting an upload that did not come through
in-app capture — has its domain rule written and tested and nothing signing anything yet.

---

## 2026-08-31 — A route that answered as a different controller

**Did.** The agent list in the review console, with the one decision a reviewer
can take about an agent — withdrawing an ID check — driven through the real UI:
click, confirm, and the agent's published listing goes dark, their tier drops to
unverified, and the tenant lookup stops finding them.

### What surprised us

**`GET /v1/review/agents` was answered by the report console.** `ReviewController`
declares `@Get(':id')` under `/v1/review`, and a single path segment is exactly
what a parameter matches — so the new route returned *"No such report"*: the
console looking for a report whose id is the string `agents`. The handler
existed, the guard was right, the response shape was right, and no request would
ever have reached it.

The available fix was to register `AgentsModule` before `ReportsModule`, which
would have made a route work because of the order of an imports array. The next
person to tidy `AppModule` would have broken it silently. The path is
`/v1/agent-review` now — one hyphen, and nothing can shadow it.

**Nothing in the suite could have caught that, so now something does.** The
phase gate walks every route in the running router; it was checking what each
one *does* and never whether the router would dispatch to it at all. It now
fails when a literal segment is registered behind a parameter on the same
prefix — a structural check that names no routes, so it covers the ones written
in phase 5 by somebody who never opened the file. Putting the collision back
fails it.

**`.listings li` matched the list inside the list.** Each attestation rendered
as its own bordered card inside the agent's card, three panels deep, every one
competing with the name at the top. A direct-child combinator. This is the
third selector bug of the same family this week — a rule written for one shape
that quietly claims another.

### A thing worth being explicit about

The console shows attestations **without the attestors' phone numbers**. A
reviewer needs to know a landlord confirmed this agent on this property and
when; they do not need the number, and a console that showed it would be a
place where every landlord on the platform could be read off by anybody holding
a reviewer token.

Withdrawn evidence is shown, marked, rather than hidden. An agent back down to
unverified with an empty list looks like an account that never tried; the same
agent with a struck-through ID check looks like what actually happened.

---

## 2026-08-31 — A flow nobody could complete

**Did.** The landlord's page, the agent's page, and the whole loop driven end
to end in a browser: sign up, ID check, ask a landlord, landlord confirms,
draft, publish, withdraw, and the listing goes dark.

### What surprised us

**The co-verification flow had been complete and unreachable.** The routes were
built, the domain rules were right, the exit gate was green — and there was no
page anywhere in the product where a landlord could type six digits. A human
could not have completed a single confirmation. Everything above it in the
ladder was therefore theoretical.

**Building the page found a hole in the route it called.** `POST
/v1/authority/withdrawal` took the landlord's phone number in the request body.
It is an unauthenticated route by design — a landlord has no account, and
requiring them to prove who they are before they may ask to prove who they are
is circular — so anybody with the link could ask for the code to be sent to
*their own* number and revoke somebody else's authority. The route was a
revocation endpoint with a confirmation step that confirmed nothing. It takes no
phone number now; the code goes to the number already on the record, which is
the only number with any standing. The gate walks that too, and it fails when
the old behaviour is put back.

**The page thanked a landlord for confirming an agent they had just
withdrawn.** One code answers both a grant and a withdrawal — the right design,
same six digits, same screen — and the response did not say which it had done,
so the page guessed from the listing count. A withdrawal that unpublished
nothing took the "thank you for confirming" branch. The server says now.

**The input was a raw browser control on a dark page.** `input[type='text']`
does not match `<input id="code">`, because `text` is the default *behaviour*
and not a default attribute. Second time this exact shape has bitten — the
first was a `display` rule that missed a bare `form` tag. The selector is now
"every input that is not one of the few that are something else".

**And the masthead was recruiting again.** The journal records fixing this for
`/reply`: the only thing in the header is *Report a number*, and offering it to
somebody who has just been accused is an invitation to retaliate. The fix was
`path !== '/reply'`, so the landlord page walked straight into it on the day it
was written. It is a named list now — `ARRIVED_FROM_A_TEXT_WE_SENT` — because
the next capability page will otherwise do the same thing.

### A decision worth recording

**The agent's session never reaches the browser.** Sign-up returns a token once.
The obvious move is `localStorage`; that puts a bearer token for somebody's
livelihood where any script on the origin can read it. It is set as an httpOnly
cookie by a route handler instead, and every agent action goes through that
handler. `document.cookie` returns an empty string on the agent page, which is
the point.

**And there is a development SMS sink, guarded twice.** Without a provider,
nobody — including us — could exercise a landlord confirmation, so the code goes
to the server's own log when `KEYS_SMS_LOG=1` *and* `NODE_ENV` is not
production. It never goes into a response body: that shortcut would turn every
landlord confirmation into a self-confirmation permanently, for real users. A
one-time code in a log is a real risk, so it is paid only on a machine somebody
is sitting at.

### Still open

An agent at `unverified` cannot advance, because no KYC vendor has been chosen.
The page says so plainly rather than offering them a step that cannot help —
sending somebody to spend a landlord's goodwill on a rung that changes nothing
is worse than telling them to wait.

---

## 2026-08-31 — The gate that finds dead code was dead

**Did.** Phase 2's tier ladder, landlord co-verification by one-time code, and
the revocation cascade — domain rules, both stores, the routes, and an exit
gate that walks every route in the running router trying to raise a tier.

### What surprised us

**`wired-check` — the gate whose entire job is finding code nothing calls —
had a rule that called nothing.** Rule 2 looks for methods on the API client
that no screen ever calls. It was pointed at `apps/mobile/src/api/client.ts`, a
path from the previous project. There is no such file here. It returned an
empty list on every run for a whole phase.

The moment it was repointed at `packages/api` it found three: `review.one`,
`review.decide`, and the `agentByPhone` written twenty minutes earlier. The
first two had been dead since the review console was built, because the console
reaches the API through a same-origin proxy — it cannot call the generated
client at all, so it hand-wrote the paths, and the client's `review.*` methods
were never going to have a caller.

**This is the sixth instance of ADR-0004, and ADR-0004's own remedy missed
it.** `scanned_nothing()` was written after the last two, precisely so a rule
whose root had moved would fail loudly. It checked three roots — the app, the
server, the domain — and not the one belonging to the rule that was broken. A
liveness check that does not cover every rule is a liveness check that tells
you the rules it happens to know about are alive.

**Then wiring the types found the next one down.** The console had hand-written
copies of the server's response shapes. Replacing them with the generated ones
would not compile: `ThroughputResponse.decisions` was declared as an inline
`Array<{ reviewer; action; count }>`, which Nest's reflector cannot see inside,
so the OpenAPI document had been describing it as an array of *strings* since
the day it was written. `api-fresh` was green throughout — it checks that the
generated client matches the document, and both were wrong in the same way.
Nothing consumed the generated type, so nothing ever disagreed with it. The
hand-written copy in the console was right, which is exactly why the lie
survived.

### What we changed because of it

- Rule 2 points at `packages/api` and matches the methods on the object
  `client()` returns, nested groups included.
- `scanned_nothing()` covers every root any rule reads, the web and the API
  package included. `_unwired_under` searches the web too — a domain rule
  applied only by the web surface would have been reported as dead.
- Roughly 450 lines of C# reader — `cs_files`, `blank_literals`,
  `public_methods`, `unwired_server_methods` — deleted. It had not run against
  anything since the repository was created.
- `ReviewerTally` is a real class, so the document describes the response.
- The console imports `ReviewItem` and `ReviewMetrics` instead of retyping them.

### Still open

Phase 2's liveness and ID check is a TurboModule against a KYC vendor nobody
has picked. Everything above it is built and gated; the bottom rung is a
release gate, not a phase gate, and it is in the ledger.

---

## 2026-08-31 — A tier you can send is a tier you can choose

**Did.** Wrote phase 2's exit gate before the code it guards, then built to it.

### What surprised us

**Breaking it on purpose caught two of three attacks and waved the third
through.** The gate posts every tier-shaped field name — `tier`, `verified`,
`trustLevel`, nested one and two deep — at every route in the running router,
then checks the agent's profile. Deleting the revocation cascade failed it.
Returning the landlord's code in a response failed it. Making the profile route
echo back a `tier` the caller had sent **passed**, because the store was never
touched and the final state was therefore correct.

Every client on earth would have believed that response. Reflecting a tier is
raising a tier as far as anybody reading the screen is concerned, and a gate
that only inspects the database at the end cannot see it. The walk now checks
what each route *says*, not only where the data ends up.

**The same shape appeared again one test down.** *A withdrawn identity takes
every listing down* stayed green with the Postgres cascade's `UPDATE` deleted —
it asserted on `unpublishedListings` in the response, and `cascade()` still
*named* the listings it intended to take down. The server was reporting its
intention and the test was reading the report. It asks the store now.

**And the fixture out-accumulated the rule.** After seven runs against the same
test database, `a code cannot be spent twice` started failing — seven runs had
created seven agents vouched for by the same landlord phone number, which is
precisely what `MAX_AGENTS_PER_LANDLORD` exists to refuse. The rule was right
and the fixture was growing. `TRUNCATE agents CASCADE` before the durable pass.

### A hole the tests found in the rules

`mayList` asked about authority and not about identity, so revoking a forged ID
dropped the agent to `unverified` and left their listings published under a
landlord confirmation from last month. The badge said nothing and the flat
stayed on the market. The ladder is climbed in order, so it has to be descended
in order: `mayList` now requires a live identity, and an identity revocation
cascades across every property rather than none.

---

## 2026-08-31 — The masthead was recruiting on the reply page

**Did.** Report and reply, at 375 points wide, both flows driven end to end
against Postgres.

### What surprised us

**The worst thing on those pages was not a layout bug.** The masthead carries
one link — *Report a number* — on every page, including the one somebody reaches
from an SMS saying they have just been reported. A one-tap route to reporting
whoever they suspect, at the moment they are angriest, put there by us.

The product's own copy, two pages away, says "a report made to damage a
competitor is the thing this registry exists to be worth nothing to". The
seven-day window, the human review, the evidence requirement — all of it is
built to make a revenge report worthless. And then the chrome offered one.

Nothing catches that. It is not a contrast failure, a broken layout, or an
inaccessible control. It is a correct component in a context where it means
something different, and the only way to find it was to open the page as the
person who receives it.

**Fixing the error state took two goes, and both failures were measurable.**
The first put the scroll in `requestAnimationFrame`, which runs before React has
committed the state that renders the message — `scrollY` stayed at 0 and
`activeElement` was `body`. The second focused the field before scrolling, and
`focus()` cancels an in-flight smooth scroll: the field sat ten points above the
viewport with the cursor in it and the page never moved.

Both looked plausible in the diff. Neither survived being measured, which is the
argument for measuring rather than screenshotting: a screenshot of a page that
did not scroll looks exactly like a screenshot of a page that had no reason to.

**Every page had the home page's title.** Somebody answering an accusation about
themselves had *check a number before you pay* in their tab and their browser
history, and the URL — which carries a capability — was indexable.

---

## 2026-08-31 — The riskiest button was the biggest because its label was longest

**Did.** Checked the review console at 375 points wide, which is a width nobody
had opened it at.

### What surprised us

**Layout was choosing the default action.** The three decisions sat in a
wrapping flex row at their content widths. On a phone that put *Uphold — publish
this* — the longest string — alone on the first row, full width, above the other
two. So the largest, most prominent control on the screen was the irreversible
one that publishes an accusation about a named person, and it got there because
of the number of characters in its own label.

Nothing about that was a decision anybody made. It is what `flex-wrap` does, and
at 1280 pixels wide it never happens, so it never showed up.

That is the second time this week a layout rule has quietly made a claim the
product would never make in words: the first was `unreachable` rendering as `0`.
Both are the interface asserting something the code was careful not to.

**And the console kept the queue's scroll position.** Tapping a report from
halfway down landed the reviewer in the middle of it with *Back to the queue*
seventeen points up, behind a sixty-seven point masthead. A browser resets
scroll on a navigation; this is one component swapping what it renders, so
nothing was going to do it. Worth noting because it only bites at a scroll depth
you reach when the queue is long — that is, in production and not in a demo.

**A disabled danger button is not just a danger button at 45% opacity.** It
washed to a muddy pink that reads as an error the reviewer has already caused,
rather than as a control waiting for them to type a reason.

---

## 2026-08-31 — Doing the web first made the app's gaps obvious

**Did.** The same design pass on the app's screens, using the web as the
reference — which is the opposite of the order I would have guessed was useful.

### What surprised us

**The web pass turned into a specification for the app.** Having just decided
what a page of this product needs — the mark so you know whose answer it is, a
lede saying what the number is checked against, a note saying what Keys does not
claim — I opened the app and it had none of the three. They were not subtle
omissions. They were invisible until something else had made the list.

**The app said the same words twice on one screen.** A header bar reading
*Check a number*, and an empty state below it reading *Check a number* under a
large icon, with nothing between them. It had been that way since the screen was
written and I had screenshotted it four times without registering it, because
each element is individually reasonable.

**And it was withholding the answer.** The web listed what a number had been
reported for; the app rendered the count and stopped. So it told somebody a
number had one upheld report against it and left them to guess whether that was
a fake listing or a no-show — on the screen whose entire job is helping them
decide whether to hand over money.

**Fixing that found the duplication I had predicted an hour earlier.** The web
had the six category sentences hardcoded in four separate files, and two had
already drifted: *A property that did not exist* on the home page, *The property
did not exist* on the report form. Harmless right up until one of the four is
missing an entry and renders a raw `no_show` at a reader. The comment I wrote in
the domain that morning — "the fourth copy is the one missing an entry" — was
describing code that already existed three files away.

### The order that worked

Doing one surface properly, then holding the other against it. Neither pass
would have found these on its own; the second one found them in minutes because
the first had produced a list of what *good* looked like for this product
specifically, rather than in general.

---

## 2026-08-30 — The web had no masthead, and nobody had noticed

**Did.** The same pass on the web surface that the app got: looked at every
page, in both schemes, at both widths, and fixed what was wrong.

### What surprised us

**Four pages and not one of them said what the site was.** Each opened with its
own `<h1>` floating at the top of an empty column. The consequence is worst on
`/reply`: somebody arriving there from an SMS, being told they have seven days
to answer an accusation, had no way to tell whose service was accusing them.

**`textarea` is monospace by default.** Browsers do that, and it meant the
report form asked for the single most important paragraph on the site — the one
a reviewer decides on — in a different typeface from every other word around
it. Nobody writes that; it is the platform's default leaking through a
stylesheet that never overrode it.

**`display: flex` on the bare `form` tag** was written for the one-row lookup
and caught the report page's whole stack of fields. That is the same mistake, in
CSS, that turned every button's text invisible on the previous project: styling
a tag when what was meant was a role. It has now been made twice in two
codebases, which is enough to call it a habit rather than an accident.

**The link colour was the browser's.** Default blue on a dark background, about
3:1 — the one colour on the page nobody chose.

### What went right

The contrast audit came back clean in both schemes on the first run, because the
palette was carried over from the app where the four status hues had already
been argued about. Doing that work once and reusing it is the whole benefit of
having a design system rather than a stylesheet.

Two new gates: `splash-check` and `mark-check`. Both exist for the same reason —
a storyboard cannot import a TypeScript constant, and a React Native SVG cannot
import a DOM one, so in both cases the only thing standing between two copies
and a slow drift is something that compares them on every build.

---

## 2026-08-30 — The splash said Backhaul

**Did.** A design pass on the running app, which is the pass nobody had done.
Every check until now had been behavioural.

### What surprised us

**The splash was another company's.** A truck drove in from the left, under the
word *Backhaul*, on the first frame of the product. It had been there since
phase 0 and I had launched the app four times without seeing it, because the
first launch spends its splash bundling and the ones after that are too fast to
read. The user saw it in about ten seconds.

Nothing could have caught it. `untranslated-check` skips single capitalised
words, so *Backhaul* read as a proper noun. `wired-check` saw `Splash` mounted
by `App` and called it wired. Every gate in the repository was green over a
launch screen with a competitor's name on it — because gates check that things
are *connected*, and this was connected, correct, and about the wrong company.

**The top inset was applied twice**, by `SafeAreaView` and again by
`ScreenHeader`, leaving 94 points of dead white above every title. Same class:
two correct pieces of code, each doing its job, wrong together. A screenshot
finds it in a second and no type system ever will.

**And the accent was the freight project's blue.** Picking a replacement turned
out to be a constraint problem rather than a taste one: the product renders four
status colours, so the accent has to sit clear of all four hues or a button
starts looking like a verdict. Indigo at 244° is the gap.

### The rule this suggests

Behaviour can be gated. Appearance has to be looked at. I had eighty-five
passing tests and nine gates over an app whose first screen was branded for
somebody else, and the fastest way to find every one of these was to open it and
look — which took four minutes and should have happened on the first day the app
ran.

---

## 2026-08-30 — Nothing had ever proved the app builds

**Did.** Generated the native projects, taught Metro where the monorepo is, got
iOS compiling, and wrote the gate that proves the app bundles at all.

### What surprised us

**No gate in this repository answered "does the app build".** Typecheck, lint,
boundary, wired, untranslated, api-fresh, and eighty-odd tests — and every one
of them reads source. `tsc` resolves modules by TypeScript's rules and Metro
resolves them by its own, and in a monorepo those two disagree for a living, so
all of it can be green over an app that cannot be bundled. `make bundle-check`
runs Metro for real and reads the artefact.

**And the artefact is where the languages actually have to be.** The domain's
tests prove the four tables are filled in and not copies of English; the
untranslated gate proves no screen hardcodes English. Neither proves the words
survive bundling — a resolver picking up a stale build of `@keys/domain` would
leave both green and ship an English-only app. So the gate reads the four
phrases out of the domain source and looks for them in the bundle.

**Checking the bundle naively finds Hausa and misses Yoruba.** Non-ASCII is
escaped, in at least two different ways — `\uXXXX` in some places, `\xNN` in
others. `Duba lamba` is plain ASCII and matched; `Ṣàyẹ̀wò nọ́mbà kan` did not,
and for twenty minutes it looked exactly like a missing translation. The gate
decodes both escape forms before searching. Worth recording because the failure
mode was *a gate reporting a bug that was not there*, which is the mirror image
of everything else this week and just as expensive.

**CocoaPods 1.16 on Ruby 4 needs a UTF-8 locale**, and says so by raising
`Encoding::CompatibilityError` from `unicode_normalize` — an error about Unicode
normalisation, from a command that was reading a Podfile path. `LANG=en_US.UTF-8`
fixes it. Written into the README so the next person loses two minutes instead
of twenty.

**Android is not verified and the documentation says so.** There is no JDK on
this machine, and installing a toolchain was not mine to do at two in the
morning. The Gradle project is the unmodified template and there is no
particular reason to expect it to fail — but nobody has watched it succeed, and
after a week of finding things that were green and could not have been
otherwise, "no reason to expect it to fail" is not a claim worth making in a
README.

---

## 2026-08-30 — The audit trail that recorded half of what it claimed

**Did.** Built the review console at `/review`, gave every reviewer a name, made
reasoning mandatory on every decision, and put both into an append-only
`decisions` table. Added `GET /v1/review/metrics`, which is the instrument phase
1's third exit gate needs.

### What surprised us

**The audit trail was recording evidence and not decisions.** I wrote the
`record` call into the controller, wrote the test, and the test failed: an
evidence entry, no decision entry. The patch had matched a string that appeared
in both handlers and landed in the wrong one. Everything typechecked, the
endpoint returned 200, the report was correctly upheld — and the row explaining
why simply was not written.

That is the same shape as everything else this week. The intention was in the
code and the behaviour was not, and the only reason it was caught within a
minute rather than a year is that something asserted the behaviour rather than
the intention.

**Attribution was in the spec from the beginning and had never been built.**
Section 4 of the backend spec has always said "reviewer attribution and audit on
every action". The console shipped behind one shared token. Every access was
correctly gated and every decision was anonymous, which is fine for a queue of
internal tasks and not fine for a surface that publishes accusations about named
people. A year from now the only questions that matter about a challenged
decision are who, when, and on what basis, and "the reports table says upheld"
answers none of them.

**Writing the token comparison, the obvious version is the leak.** Comparing
lengths before `timingSafeEqual` — which throws on a length mismatch, so you
have to — tells an attacker how long a real token is. Hashing both sides first
makes every comparison the same length whatever was presented.

**And a variable slip wrote a controller into a DTO file.** Two `pathlib.Path`
handles, one `write_text` against the wrong one. Twenty-odd compiler errors, all
of them the same cause, and thirty seconds to undo because everything was
committed. Worth noting only because it is the argument for small commits, made
by the day rather than by a book.

---

## 2026-08-30 — A durable store, and turbo quietly halving the coverage

**Did.** `ReportsStore` became an interface with an in-memory and a Postgres
implementation. Wrote the migration with the publication rule as three `CHECK`
constraints. Parameterised both server suites over every store. Closed the last
of phase 0's debt that could be closed without a device.

### What surprised us

**The suites ran against a `Map` while the Makefile was handing them a
database.** `make test` resolved `KEYS_TEST_DATABASE_URL`, exported it, and the
server suite reported nineteen tests instead of thirty-six. Turbo filters the
environment by default and drops anything not declared in `turbo.json`, so the
variable never arrived — and nothing anywhere said so. It looked exactly like a
passing run.

That is the fifth variation of the same thing this week: a check that is green
and could not have been otherwise. Here it was not even a gate at fault, it was
a build tool's cache-correctness feature doing its job. The fix is the same one
every time — **make it say what it did**. `make test` now prints a warning when
it cannot find a database, because passing quietly on half the coverage is worse
than failing.

**Writing the rule as constraints found nothing, and that was the point.** All
three `CHECK`s went in green, which is the boring outcome and the one that
proves the domain has actually been holding the line. What is different now is
that the rule survives a route somebody adds without reading `review()`, a
caller who forgets to filter, and a `psql` session at 2am — three ways past a
rule that until tonight had one guard. Written up in
[ADR-0005](adr/0005-a-rule-this-serious-lives-in-three-places.md), which had to
argue with [ADR-0001](adr/0001-the-server-imports-the-domain-rather-than-mirroring-it.md)
to get there: this codebase's whole position is that one rule lives in one
place. The distinction is that the C# mirror was *the same rule described twice
for two runtimes*, which drifts, and a `CHECK` constraint is the same sentence
expressed as something the database can refuse.

**And the whole product runs.** Report a number on the web, restart the server,
the report is still there and still invisible; the reported party answers
through the link; a reviewer records evidence and upholds it; the lookup page
turns from zero to one with the categories and the words about who decided.
That is the wedge, working, on a store that survives a restart — with no SMS, no
uploads and no listings, which is exactly what phase 1 was supposed to be.

---

## 2026-08-30 — The mobile app had never been compiled

**Did.** Made `apps/mobile` a package, wrote the app root, a language picker and
the lookup screen, and the first mobile test. Reseeded the design system from
the previous product's vocabulary to this one. Fixed two more gates that could
not fail. Documentation brought in line with what exists.

### What surprised us

**Seventeen files had never been compiled by anything.** `apps/mobile` held the
ported components, `jest.setup.js`, and no `package.json` and no tsconfig — so
it was not a workspace package, turbo never saw it, and no gate had ever read a
line of it. Making it one produced sixteen type errors, including
`Unready.tsx` importing `refusalWords` from `../state/words`, a module that does
not exist. It had been sitting in the repository since phase 0.

Phase 0's gate said "one domain package imported by mobile, web and server". It
was called green on the server alone. That is recorded in the roadmap rather
than backdated: a gate called green early is worth more as visible debt than as
a corrected date.

**The palette described trucks.** `moving`, `stopped`, `stale` and `exception`
came across with the design system and are now `clear`, `caution`, `offline` and
`alarm`. A token whose name describes another product is a token somebody will
eventually use for the wrong thing, and in this product the wrong thing is
colouring a failed lookup red — telling a reader a number is dangerous when the
truth is the phone could not ask.

**Two more gates could not fail.** `@keys/api`'s test script ended in `|| true`
and there were no tests to run, so it reported success unconditionally. And
`scripts/api-fresh.sh` died under `set -e` printing nothing at all when `nest`
lost its executable bit in a pnpm relink — twenty minutes of a gate failing
silently. It now names the step it was on.

That is five gates in two days that were green and could not have gone red. The
pattern is consistent enough to be worth stating plainly: **a gate is not done
when it passes, it is done when you have watched it fail.**

**The first mobile test is the one the whole product turns on.** A lookup that
could not reach the server must not render as `0`, because `0` reads as *no
upheld reports against this number* — a false all-clear to somebody about to
hand over an inspection fee. `Query` has kept `unreachable` apart from `ready`
since it was ported, but the type only makes the distinction available. Proved
by making the screen commit exactly that mistake and watching it go red.

---

## 2026-08-29 — Phase 1, and three guards that could not fail

**Did.** Built the scam registry: publication policy in the domain as an
allow-list, three doors onto one store, the reviewer console, right of reply by
a texted capability, retention with a deletion date on the row. The web wedge
as server-rendered pages — check a number, report one, answer one, no account.
The API client generated from the controllers, with a gate that fails when it
drifts. Phase 1's software gate is green; two human gates and the SMS provider
are open.

### What surprised us

**The exit gate passed while the thing it guards was broken.** I broke it four
ways on purpose. Removing `@UseGuards` from the review console: caught. Leaking
`reporterId`: caught. Adding a debug route that dumps the store: caught, which
is the one that proves the route enumeration is doing work rather than testing
a list I wrote. Dropping `publishedAt !== null` from the store's public read:
**passed.** Every route test stayed green, because the controller filters a
second time through the domain. The filter whose own comment calls it "the one
that matters" was held by nothing, and it is the last line standing the first
time somebody changes that controller. It has its own test now, with no
controller in the way.

**Three of the four guards ported in phase 0 could not fail.** `wired-check`
printed "everything exported is wired to something" while `NOT_UPHELD_RETENTION_MONTHS`
had no caller anywhere — its rules still named Backhaul's C# repository
directories, so it was scanning nothing and saying so in the language of
success. `untranslated-check` was listed in `make gates` and exited zero
unconditionally, and resolved its scan path against the working directory, so
from any folder but the root it examined no files and printed a clean line.
Both fixed, both now fail when they examine nothing, both proven by breaking
them.

That is the same defect the guards exist to catch, one level up: written,
plausible, connected to nothing. Porting a guard between repositories is
writing a new guard, and it passing on arrival is evidence of nothing. Written
down as [ADR 0004](adr/0004-a-gate-that-cannot-fail-is-not-a-gate.md).

**Generating the client caught a lie in the document.** `@ApiOkResponse` on a
POST described a `200` the server never sends; Nest answers `201`. A
hand-written client would have carried that for a year.

**And running the actual product found what no unit test could.** The web
report form collects no evidence, `review()` refuses to uphold without
evidence, and file upload belongs to phase 3. Two correct decisions with no
path between them, and every report reachable from the public form permanently
unupholdable. Fifth time this shape has appeared across these two projects.
The bridge is a reviewer recording evidence they obtained out of band, keyed
`reviewer-attested:` so an audit can see exactly what it is, and phase 3
replaces it.

---

## 2026-08-29 — Phase 0, and a guard that reported clean over a copy

**Did.** Started Keys. Monorepo with mobile, web, server and two shared
packages; NestJS server importing `@keys/domain` rather than mirroring it;
design system, fourteen components, the splash and the data layer ported from
the previous project; every gate wired and `make ci` green.

### What surprised us

**The gates caught my own over-porting within the first hour.** I copied
`native/permissions.ts` and `state/ids.ts` across because both are obviously
going to be needed, and `wired-check` reported them as imported by nothing.
They were. The right answer was to delete them and port them in the phase that
uses them, because carrying code ahead of its use and exempting it is exactly
how the previous project accumulated ten written excuses, one of which turned
out to be false.

**The Phase 0 gate test passed while the gate was being violated.** The
condition is "one domain package imported by the server, not copied". The first
test compared a response against the imported module, which proves the import
resolves and nothing more. Replacing `say('en', 'verified')` in the controller
with the literal `'Verified'` left it green, because the copy and the module
agreed at that moment. A copy is not wrong for being different today; it is
wrong because nothing stops it becoming different.

I only found that because I broke it on purpose. The structural test that
actually catches it was written afterwards, and would not exist otherwise.

**Then the structural test was broken too, in a more interesting way.** It
scanned server source for string literals matching a phrase, using a regex that
matched quoted runs of three characters or more. `'ok'` is two, so it was
skipped — and skipping one quote puts the whole scan out of phase, pairing the
closing quote of one string with the opening of the next. It reported no
offenders and looked exactly like a passing check. Match every string, then
filter by length; never the other way round.

Two guards, two false greens, both found by feeding them the thing they were
written to catch. That is now three projects running where the same practice
has found a bug in a guard rather than in the code.

**No parity suite here, and the absence is the point.** ADR-0001. The previous
server was C# and every shared rule existed twice; a third of the server work
was keeping the copies honest. `fixtures/parity.json`, `emit-fixtures.ts` and
the `fixtures-check` gate do not exist in this repository, because there is
nothing to hold in sync.

What we give up is real and worth naming: comparing two implementations across
a serialised boundary caught wire-format bugs neither side would have caught
alone. Contract tests against the OpenAPI schema take that job in phase 1, and
they have to be written deliberately rather than assumed.

---

