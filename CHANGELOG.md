# Changelog

Everything here is what changed for someone *using* Keys. Internal refactors
that nobody outside can observe do not appear.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- The scam registry: public lookup with no account, reporting with evidence, a
  reviewer-guarded review console, and right of reply by a texted capability.
- `packages/domain/src/reports.ts` — the publication policy, written as an
  allow-list so a status invented later is hidden until somebody says otherwise.
- Retention: a dismissed report carries the date it will be deleted, and the
  store purges on the read rather than on a schedule that can stop running.
- ADR 0002, 0003 and 0004.
- `apps/web` — the wedge as a server-rendered page. Check a number, report one,
  answer one, with no account and nothing to install. The result has a URL, so
  it can be sent to somebody. Numbers are normalised, because 0803, +234 803 and
  803 are one number and a registry that treats them as three answers "nothing
  found" about a number it holds.
- `POST /v1/review/:id/evidence` — a reviewer records evidence obtained out of
  band, prefixed `reviewer-attested:`. Phase 1 has no upload and `review()`
  refuses to uphold without evidence; without this the web report form led
  nowhere.
- The generated API client: NestJS emits `packages/api/openapi.json` from the
  controllers' own decorators, `openapi-typescript` turns it into `schema.ts`,
  and `scripts/api-fresh.sh` fails the build when either drifts. Response DTOs
  so the document describes what comes back, not just what goes in.

  Generating it immediately caught the document advertising `200` on POSTs the
  server answers with `201`.
- `apps/mobile` is a package. It held seventeen `.tsx` files, no manifest and no
  tsconfig, so nothing had ever compiled them. Compiling them for the first time
  found sixteen errors, including an import of `../state/words`, a module that
  does not exist.
- The app root, a language picker and the lookup screen, and the first mobile
  test: a lookup that could not reach the server must not render as zero upheld
  reports. Proven by making the screen commit exactly that mistake.
- `POST /v1/review/:id/evidence`.
- **A durable store.** `ReportsStore` is an interface with two implementations,
  and the server picks Postgres when `KEYS_DATABASE_URL` is set. The fallback to
  memory announces itself — `/healthz` asks the store rather than the
  environment — because a server that quietly loses every report on restart
  while every log line looks normal is the worse failure.
- The publication rule as three `CHECK` constraints on the `reports` table, each
  proved by inserting a row that breaks it and watching Postgres name it. See
  [ADR-0005](docs/adr/0005-a-rule-this-serious-lives-in-three-places.md).
- Both server suites are parameterised over every store, and `make test` finds a
  database when one is reachable and says plainly when it cannot.
- **The native projects.** `apps/mobile/ios` and `apps/mobile/android`, from
  the React Native 0.87.1 template with the bundle identifier `ng.keys.app`, a
  Metro config that watches the workspace and searches both `node_modules`, and
  the build output gitignored. **iOS compiles for the simulator.** Android is
  the unmodified template and has not been compiled here — no JDK on this
  machine.
- The development API address is chosen per platform. It was hardcoded to
  `10.0.2.2`, which is the host as seen from the Android emulator and
  unreachable from the iOS simulator — so the app looked like it had a broken
  server rather than a wrong address. Found by running it on a simulator.
- `make bundle-check` — the app bundles, and all four languages are present in
  the artefact a device runs. Nothing else in the repository proved the app
  builds at all: `tsc` and Metro resolve modules by different rules, and in a
  monorepo they disagree for a living. Proved by breaking an import and by
  copying a language table from English.
- **The review console**, at `/review` on the web surface. One report at a time,
  everything needed to decide in one view, and no way to decide without saying
  why. Its proxy takes an allow-list of paths rather than forwarding whatever it
  is handed, and the reviewer's token lives in `sessionStorage` — it reads every
  unreviewed accusation in the registry and should not outlive the tab.
- **Reviewer attribution and an audit trail.** `KEYS_REVIEWERS` holds
  `name:token` pairs; every decision and every recorded piece of evidence is
  written to an append-only `decisions` table with the reviewer's name and a
  mandatory reason. `KEYS_REVIEWER_TOKEN` still works and resolves to
  `unattributed`.
- `GET /v1/review/metrics` — decisions by reviewer, queue depth, and the age of
  the oldest waiting report. Phase 1's third exit gate needs this number.
- `.githooks/pre-push` runs `make ci` before anything leaves the machine, after
  a commit went out while its CI run was still in the background and the
  `api-fresh` failure in it went unread. `make setup` points git at it.

### Changed

- **The app's screens got the pass the web got.** The lookup screen opened with
  a header bar carrying the same words as the empty state below it, so
  *Check a number* appeared twice on one screen with nothing between them saying
  what the number would be checked against. It now opens the way the web does:
  the mark, the question, a lede, the field — and a note at the bottom saying
  what Keys does and does not claim.
- The placeholder empty state is gone. It repeated the screen's own title under
  a large icon, occupying the space the answer uses.
- **The answer card names the categories.** The web listed what a number was
  reported for and the app did not, so it told somebody a number had one upheld
  report and left them to guess whether that was a fake listing or a no-show.
  Six categories, four languages, derived from `categoryPhrase` rather than
  typed out per call site.
- Four files on the web each carried their own English map of the same six
  categories, and two of them had already drifted apart. One helper now, backed
  by the domain.

- **The web surface has a design layer.** It had a masthead on no page, so
  nothing said what the site was — somebody arriving on `/reply` from an SMS had
  no way to tell whose service had just accused them of something. There is now
  a masthead with the mark, a footer carrying what Keys does and does not claim,
  a type scale, and a spacing scale.
- Plus Jakarta Sans, self-hosted through `next/font` so a reader on a Nigerian
  connection makes no request to Google and the page cannot be blocked by
  somebody else's CDN. The app keeps the platform face for the reason
  `DESIGN.md` gives; the web has no such constraint.
- The web palette is the app's, to the hex, including the indigo accent and the
  four status colours.

- **The splash was the freight project's.** A truck drove in from the left under
  the word *Backhaul*. It shipped that way and was found by watching the app
  start, not by any gate. Keys now has its own mark — a keyhole, drawn as one
  SVG path rather than assembled from two borrowed glyphs, because a logo made
  of icon-set pieces is a placeholder that ships. A keyhole rather than a key:
  a key is a thing you own, a keyhole is the thing you look through before you
  commit, which is what this product is for.
- **The accent is deep indigo `#2E2A6E`**, replacing the ported `#1A4FA0`.
  Chosen against the four status hues — clear 149°, caution 33°, alarm 4°,
  offline 212° — because an accent near any of them makes a button look like a
  verdict. 12.6:1 against white, which is what a cheap screen in Nigerian
  daylight needs.
- The native launch screen matches the splash field, so a cold start no longer
  flashes white before the app draws, and it no longer advertises React Native
  on the first frame of the product.

- The mobile palette says what it means in this product. `moving`, `stopped`,
  `exception` and `stale` described trucks; they are now `clear`, `caution`,
  `alarm` and `offline`. `Card` gained an `alarm` emphasis, which is never used
  for a request that failed — telling somebody a number is dangerous when the
  truth is the phone could not ask is the same false statement in the other
  direction.
- `@keys/api` exposes results as well as exceptions. Server-side rendering wants
  exceptions; a phone wants `unreachable` and `refused` kept apart all the way
  to the screen.
- The four language tables gained thirty-one phrases the ported components and
  the new screens actually use.
- `wired-check` asks about symbols rather than modules for the seams too, after
  the module-level rule reported clean while three exports in `state/server.tsx`
  were dead.
- `turbo` was dropping `KEYS_TEST_DATABASE_URL` — it filters the environment by
  default — so the server suites ran against a `Map` while the Makefile was
  handing them a database. Declared in `turbo.json`.
- `doc-check` checks which phase the roadmap marks **current**, not merely that
  the number appears somewhere. It had passed for the whole of phase 1 while the
  roadmap still said phase 0.

### Fixed

- **The masthead offered "Report a number" on the reply page** — to somebody who
  arrived from an SMS telling them they had just been reported. A one-tap route
  to reporting whoever they suspect, at the moment they are angriest, is an
  invitation to retaliate, and a registry of revenge reports is the failure the
  whole review process exists to prevent. The link is still on the home page; it
  is not put in front of them there.
- **A refused report moved nothing on the page.** The message rendered at the
  bottom of the form, so on a phone — where the submit button is already below
  the fold — pressing send appeared to do nothing at all. The cursor now lands
  in the field that is wrong and the page scrolls to it, and the confirmation is
  scrolled to on success for the same reason.
- Every page inherited the home page's title, so somebody answering an
  accusation about themselves had *check a number before you pay* in their tab
  and their browser history. `/reply` has its own title and is not indexed — the
  URL carries a capability and has no business in a search index.
- `normalise` moved out of `lookup.ts`, which also builds the API client from
  `KEYS_API_URL`. Importing it into a browser component would have pulled a
  server-only module, and a variable Next does not inline for the client, into
  the bundle to get one regular expression.

- **The review console's most consequential button was its most prominent, by
  accident.** The three decisions were a wrapping flex row, so on a phone the
  longest label — *Uphold — publish this* — took a full row above the other two
  and became the largest thing on screen. Which of three outcomes looks like the
  default was being decided by the length of its own text. Equal-width grid now,
  stacked on a phone and three columns on a desktop, with the danger colour on
  the one that publishes an accusation but no extra weight.
- Opening a report kept the queue's scroll position, so a reviewer working down
  a long queue landed in the middle of the report with *Back to the queue*
  already hidden behind the sticky masthead. A browser does this for a
  navigation; this is one component swapping what it renders, so nothing was
  going to do it.
- A disabled danger button washed to a muddy pink at the shared 0.45 opacity and
  read as an error rather than as a control waiting for input.

- **The reply link rendered in the browser's default blue** — the one colour on
  the page nobody chose, at about 3:1 against a dark background.
- **`textarea` was monospace.** Browsers default it that way, so the report form
  asked for the most important paragraph on the site in a different typeface
  from everything around it.
- `display: flex` was set on the bare `form` tag, so it caught the report page's
  stack of fields as well as the one-row lookup it was written for. Styled as a
  role now — the same mistake, in CSS, that turned a whole screen's buttons
  invisible on the previous project.
- Section headings in the review console were `<p><strong>`: visually a heading,
  semantically a paragraph, so nothing established rank and a screen reader
  could not jump between them.
- A `<br />` after a block-level `<strong>` put an empty line inside every queue
  row.
- The hero was a fixed 2.5rem, which filled two-thirds of a 375px screen and
  pushed the search field — the only thing anybody comes to the page for —
  below the fold. Fluid now, and the wrapped button fills its row.
- Every form control inherits the page's face and sits at a 16px minimum, so
  iOS does not zoom the page on focus.

- **The top safe-area inset was applied twice** — once by `SafeAreaView` at the
  app root and again by `ScreenHeader` — leaving 94 points of dead white space
  above every title on an iPhone 17. The app root owns the safe area now.
- `ScreenHeader` was the first child *inside* the scroll container, so it took
  the container's horizontal padding and its bottom rule stopped twelve points
  short of each edge, and it scrolled away with the content — the one thing a
  bar that exists to sit above the scroll must not do.
- The language picker centred four cards on a tall screen with nothing above
  them, which reads as a screen that failed to load. Anchored near the top,
  under the product's name.
- Two `AsyncStorage` keys still named the previous product: `backhaul.language`
  and `backhaul.appearance`.

- `wired-check` reported clean while scanning nothing — its rules still named
  Backhaul's C# directories. Reseeded for this stack, and it now fails when a
  scan root holds no source.
- `untranslated-check` was a listed gate that exited zero unconditionally, and
  resolved its path against the working directory. Both fixed.
- The store's `publishedAt` filter was held by no test; removing it left every
  route test green. Now held directly.

### Removed

- `packages/domain/src/trip.ts`, `phrases()` and `describeLanguage()` — ported
  from Backhaul and called by nothing. Deleted rather than exempted.
- `useTripData`, `useMine` and `emptiness` — the first is about trips and a
  `DemoTrip` that does not exist here, the second is `useQuery` with another
  name, and the third has no list to be called from yet. All three come back
  when something calls them.


### Added

- **Phase 0 begins.** A monorepo with four consumers of one rules package:
  the React Native app, the web app, the NestJS server and the tests.

  The server change is the one with consequences. On the previous project the
  server was C# and the rules were TypeScript, so every shared rule existed
  twice and a generated parity suite held the two copies together. Here the
  server imports the same package the phone imports. There is no second
  implementation, so there is nothing to keep in sync — `fixtures/parity.json`
  and the `make fixtures` step are simply gone.

  That matters most for `is_verified`. It is the claim Keys sells, it has to
  mean the same thing on the renter's phone, the agent's phone, a
  server-rendered listing page and the server, and sharing the code is a
  stronger guarantee than testing two copies agree.

- **The design system, ported whole.** Tokens, theming with a system
  preference, and fourteen components that carry no domain with them —
  including the splash, whose timing contract took four passes to get right on
  the last project and is not worth rediscovering.

- **The data layer, ported.** `useQuery` with a real state union, and
  `emptiness()` answering which of five things "nothing here" means: loading,
  unreachable, refused, genuinely empty, or hidden by a filter. Keys needs the
  distinction more than the last project did — a renter shown "no listings"
  when the network failed learns the wrong thing about the product.

- **CORS as an allow-list from the first commit.** Keys has a web surface on
  day one. The last project had no CORS policy at all until a browser client
  existed, because a phone sends no preflight.
