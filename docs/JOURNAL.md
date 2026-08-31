# Keys — Journal

What we did, and what surprised us. One entry per working session, newest
first. The surprises are the point: a journal of what went to plan is a
changelog with worse formatting.

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

