# Keys — Journal

What we did, and what surprised us. One entry per working session, newest
first. The surprises are the point: a journal of what went to plan is a
changelog with worse formatting.

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

