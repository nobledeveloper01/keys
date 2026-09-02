# Changelog

Everything here is what changed for someone *using* Keys. Internal refactors
that nobody outside can observe do not appear.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Agent verification.** A tenant checking a number now gets both halves of the
  answer: what has been held against it, and what has been confirmed about
  whoever trades under it. The second half is a sentence naming what was
  actually checked — *"a landlord has confirmed a property they may let"* — and
  never a badge, because a badge is a claim nobody can audit and a shape anybody
  can screenshot. When there are upheld reports it also says, in words, that
  being checked is not an answer to them.
- **Landlord co-verification.** An agent asks; Keys texts the landlord a code;
  the landlord enters it on a page that needs no account. Withdrawal works the
  same way and is exactly as easy, because an authority nobody can take back is
  not an authority. Withdrawing takes every listing that stood on it off the
  market in the same transaction, not on a later sweep.
- **The agent's own page** on the web: open an account, ask a landlord, draft a
  listing, publish one. It shows the agent the exact words a tenant reads about
  them. The session is an httpOnly cookie set by the server — nothing in the
  browser can read it.
- **The agent list in the review console**, with the one decision a reviewer can
  take: withdrawing an ID check, which drops the agent to unverified and
  unpublishes everything they have, everywhere, at once. Landlords' phone
  numbers are not shown.
- Tier sentences in Hausa, Yoruba and Igbo alongside English.
- **Duplicate detection, end to end.** An accepted capture is perceptually
  hashed and matched against every image Keys holds. A match opens a pair in a
  reviewer's queue — asked once, however many photographs the two listings
  share — and blocking the copy costs it the Verified badge. Nothing is blocked
  on arithmetic: the same photograph legitimately appears on two listings when
  an agency changes hands or a flat is re-let. Only the copy is penalised; the
  agent who was copied keeps their listing.
- **Verified listings expire.** An agent says a listing is still available from
  their own screen, and it stops being Verified a fortnight later if nobody
  does. Being shown a flat that was let weeks ago is the most common complaint
  in this market; the cost falls on the agent, which is the point.
- **The evidence panel can be read by a screen reader.** It announced the nine
  conditions with no indication of which were met — the whole content of the
  page — because the tick is an image and the row had no label. Each row now
  says its state in words.
- **Nothing breaks at the largest text size.** Tab labels stay on one line,
  listing titles and addresses wrap instead of truncating, and the cost
  breakdown stacks label above figure when two columns stop fitting.
- **Session tokens are in the iOS Keychain.** They were in a plain file in the
  app container — readable on a jailbroken phone, present in an unencrypted
  backup. Any existing token moves across on first launch and the old copy is
  deleted. There is no fallback: a phone with nowhere safe to keep an account
  refuses to open one and says so, because a fallback would have looked like
  this was fixed while it was not.
- **v1.0 has a scope now.** Where it has no vendor, Keys does the work by hand
  and says so: a reviewer telephones the landlord and looks at the identity
  document, recorded under their own name with an account of what they saw.
  Published reports and paid placement are out of v1.0. Seven release gates left
  the launch path, none of them by pretending.
- **Saved places you can read without signal.** Save a listing and the address,
  the price and what had been checked stay on the phone. It never shows the
  badge — not even for a copy saved thirty seconds ago — because a badge means
  Keys checked this, and a phone with no signal has checked nothing. It says
  what Keys *had* checked, when you saved it, and that it cannot check again
  until you have signal.
- **Search that scales without changing its answers.** A trigram index and a
  bounding box narrow the query in Postgres; the domain still decides what
  matches and what is near. Not full-text search, which matches whole words and
  would have stopped finding Yaba when you typed "yab", and not PostGIS, which
  would have been a second implementation of distance. Nothing is narrowed on
  whether a listing is Verified — that answer is recomputed on every request and
  is not allowed to live in a WHERE clause.
- **Somewhere for actual photographs to live.** A capture was a 40×32 greyscale
  grid and nothing else — enough for a perceptual hash, and not enough for
  anybody to look at the flat. Media is stored under its own hash, served only
  through the listing it belongs to, and the signature now covers the
  photograph *and* the grid: signing one without the other would let a stolen
  picture arrive with an invented grid and match nothing.
- **Photographs now survive a restart.** The captures store had no durable
  implementation — it was in memory in production as well as in tests — so
  every deploy silently took `capture_on_site` and `walkthrough_video` off
  every listing in the catalogue, and every agent would have had to walk back
  to their property and photograph it again. Spent nonces went with them, which
  made every previously-used capture replayable after a restart.
- **An upload says what it will cost before it costs it.** "This will use about
  4.2 MB", in your language, and it waits for an answer when you are on mobile
  data. Saying so in a progress bar afterwards is saying so after the money is
  gone. A capture too large to send is refused rather than quietly re-encoded,
  because re-encoding would break the signature the whole capture rests on.
- **Deleted sentences for things Keys cannot do.** The dictionary contained
  "Saved on this phone. It will send when you have signal." in four languages,
  and a banner ready to render "3 waiting to send" — for a queue that does not
  exist. A new gate now fails the build when a phrase is written in four
  languages and used on no screen.
- **Paid placement that cannot buy a ranking.** Featured listings appear in a
  band above the results, labelled "These agents paid to appear here", and are
  taken out of the list below so nobody appears twice. They must be Verified,
  must match what you searched for, and are capped at three. The ranking
  function has no idea featuring exists — no parameter, no field — so a slot
  cannot quietly become a boost later.
- **Report a listing without knowing whose it is.** Reports used to need a phone
  number, which meant a tenant who found a place through search — and so has
  never seen one — could read the whole evidence panel, believe it was
  fiction, and have no way to say so. Keys resolves the agent from the listing;
  the number stays where it was. A reviewer judging whether a place is real can
  now open the place.
- **Ask an agent without giving them your number.** A tenant messages about a
  listing and Keys holds both numbers back until each side offers theirs. An
  offer nobody has answered can be taken back. A message with a number in it is
  refused rather than quietly stripped, because somebody who thinks they sent
  their number waits for a call that never comes.
- **Arranging a viewing, at a fee named in advance.** The agent says what they
  will charge to show it — zero is an answer — so being asked for more at the
  door is a broken claim rather than an argument about what was said.
- **Saying what happened when you went.** *There was nothing there* takes the
  badge off the listing on the very next search. The agent lifts it themselves
  by going back and photographing the property: ten minutes for somebody who has
  the flat, impossible for somebody who never did. No reviewer, no queue, and no
  way for one stranger to take a competitor off the market.
- **What it actually costs.** A listing states rent, agency fee, agreement fee,
  caution deposit and service charge, and Keys totals them: ₦800,000 advertised
  is ₦1,100,000 to move in, and that figure is on the search row as well as the
  listing. A fee above the customary ten per cent is named as such. A listing
  that has not said what it costs is not Verified — an explicit zero is an
  answer an agent can be held to, and silence is not.
- **A Find tab.** Search for a place, checked places only by default, and a
  listing page that publishes its evidence — all seven conditions, ticked or
  not, in your language — with the agent's name and what was checked about
  them. Finding a place is first and checking a number second, because
  checking is what you do when an agent has already found you.
- **Search.** Published listings, Verified first — and Verified is computed on
  every search rather than stored, so a listing whose landlord withdrew a
  minute ago is gone from the next results with nothing having to re-index.
  The ranking says *why* each result sits where it does, because a ranking
  nobody can interrogate is one somebody will assume was bought. No paid
  placement anywhere in it.
- **A listing page publishes its evidence, not a badge**: all seven conditions,
  met or not, in the reader's language.
- **The agent's account is a list of properties, not a wall of forms.** It was
  one endless scroll: standing, a landlord form, every listing, a draft form,
  and sign-out, with every form permanently open. Now it is your standing, your
  properties as rows you can scan, and one button. Each property has its own
  screen with a checklist — seven short rows, ticked or not, with the
  instruction only on the one you can do next — and the actions for that
  property in the order they have to happen.
- **Agents photograph a listing from their own screen.** Mark where the
  property is while standing at it — recorded once, and not movable, because
  moving it would change what every photo already taken there proves — then
  take a photo or record a walkthrough. The camera actions do not appear until
  the property has a location, so nobody walks a flat taking photographs that
  cannot count.
- **A capture can now prove it was taken at the property.** Listings carry
  coordinates, and `capture_on_site` measures the real distance — a condition
  that had been unsatisfiable on every listing since it was written, because
  nothing knew where a property was. A genuine capture two kilometres away is
  still a genuine capture, and still does not satisfy it.
- **In-app capture, photographs and walkthroughs.** The camera opens inside
  Keys, records where it was taken, and hands back what the hash reads. A
  walkthrough records sound, will not stop before thirty seconds, and tells the
  agent how long is left rather than refusing after they have uploaded it.
  There is no gallery picker and there will not be one.
- **The phone signs its own captures.** A P-256 key generated inside the Secure
  Enclave, which cannot be exported by anything including Keys itself. What the
  signature proves is the path the bytes took — the Keys camera, on this
  agent's device, at a stated place and time — not what is in them; perceptual
  hashing asks that, and the two defences are kept apart deliberately.
- **Answering a report, in the app.** A link in the text message opens Keys
  straight on the reply screen — no tabs, no sign-in, because holding the
  texted token is the only proof of control over a number that this product
  accepts. It is an https link, so somebody without the app gets the web page
  instead of a link that does nothing.
- **The right of reply is actually sent.** Phase 1 built the token, the route
  and the page, and nothing that delivered any of it: "seven days to answer"
  was a sentence in the copy and a column in a database. A report now queues a
  text to the reported number with their link in it.
- **Reporting a number, from the app.** This was web-only for two phases: a
  tenant could look a number up on their phone, get scammed that afternoon, and
  have nowhere in the app to say so. It is reached from the answer card, with
  the number carried across, and the warning about what a report *is* sits
  above the fields rather than under the send button.
- **A settings screen**: language, changeable after first run because a phone
  shared between a shop owner and their nephew has two readers, and appearance
  — which puts the dark half of the palette on a screen for the first time.
- **The agent screens on the phone**, behind a two-tab bottom bar: open an
  account, ask a landlord, draft, publish, and see which of the seven Verified
  conditions each listing still needs. Every sentence in four languages,
  including the seven conditions.
- The agent is shown the exact words a tenant reads about them, in quotation
  marks, rather than a badge or a score.

### Fixed

- `POST /v1/authority/withdrawal` took the landlord's phone number from the
  request, so anybody with the link could have the code sent to their own
  number and revoke somebody else's authority. It takes no number now; the code
  goes to the number already on the record.
- The landlord's page thanked people for confirming an agent they had just
  withdrawn. One code answers both, and the server now says which it did.
- Inputs written without a `type` attribute rendered as raw browser controls —
  a white box with a grey bevel on a dark page.
- The masthead offered *Report a number* on the landlord page, one tap from a
  message about somebody they know.
- `GET /v1/review/agents` was answered by the report console as a lookup for a
  report with the id `agents`. Moved to `/v1/agent-review`, and the phase gate
  now fails when any route is registered behind a wildcard that eats it.
- Revoking a forged ID left the agent's listings published under a landlord
  confirmation from the month before. Losing an identity now takes down
  everything that rested on it.
- **An agent who signed up as `08099887766` was invisible to a tenant searching
  `+2348099887766`.** Sign-up hashed the raw typed string; lookup hashed the
  E.164 form. `normalise` now lives in `packages/domain` and `hashPhone` calls
  it, so one number cannot have two hashes.
- "1 properties a landlord confirmed" — the singular case, on both surfaces.
- **Tapping "Send this to whoever asked" opened the report screen.** `Press`
  lifted flex properties onto the pressable but left margins on the view
  inside, so every control's touch area included the gap above it — and where
  two stacked, the lower one's target covered the upper one's text. On the
  lookup card that was the wrong action from the wrong tap, on the one card
  where the difference matters.
- The two actions on the answer card had touch targets about twenty points
  tall, well under the forty-four this product holds itself to.
- The capture route accepted a signed *claim* without the bytes it described,
  so a genuine capture's paperwork could be attached to a stolen photograph.

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
