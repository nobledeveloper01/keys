# Design system

Read this before any visual or interaction decision. Colour, type, spacing and
target sizes are defined here and deviations need explicit approval.

Full rationale lives in the UX design document; this is the operative
reference and the tokens are the source of truth in
`packages/design-tokens`.

---

## Three faces, one binary

| Face | Wants | Default type | Target size |
|---|---|---|---|
| **Renter** | To not lose ₦10,000 | `bodyOutdoor` — 19/28 | **64 dp** |
| **Agent** | A clean record, and listings that let | `body` — 16/24 | 48 dp |
| **Reviewer** | To get through the queue without being wrong | `body` — 16/24 | 48 dp |

The renter face is not the agent face with bigger text. It is a different
product for a different person in a different place: **the renter is standing
outside a compound**, in daylight, on a cheap screen, about to decide whether to
hand cash to somebody in front of them. They did not choose this app; somebody
sent them a link. Everything they need has to fit one screen, work with no
account, and be legible at arm's length in the sun.

The agent and the reviewer are both sitting down.

**The reviewer face is a product surface, not an admin panel.** Its throughput
is the hard constraint on how fast Keys can enter a city, so it is designed like
something a person uses for six hours, not like something bolted on for
ourselves.

---

## The four rules that are easy to break by accident

### 1. Never let "we could not ask" look like "we checked"

A lookup that failed has told the reader nothing. Rendered as `0`, it says *no
upheld reports against this number* about a number the app never asked about —
a false all-clear, to somebody deciding whether to pay an inspection fee.

This is the same rule the tracking product in this portfolio enforces about the
age of a position, and Grid about measured versus modelled, arrived at for the same reason: **a figure shown
with more confidence than its provenance supports is worse than no figure.**
`Query` keeps `unreachable` and `refused` apart from `ready` all the way to the
screen, and `apps/mobile/__tests__/unreachable-is-not-zero.test.tsx` exists
because the type only makes the distinction *available*.

A clean result carries its own caveat in the same breath: *most scams are never
reported, and a number used for the first time today has nothing against it
either.*

### 2. Not knowing is grey, never red

`offline` is `#6E7B8A`, deliberately not an alarm colour, and `alarm` is
reserved for one thing: a report a person reviewed and upheld.

Colouring a failed request red tells somebody a number is dangerous when the
truth is that the phone could not ask — which is the first rule's mistake in
the other direction, and the more damaging one, because it is an accusation.
`Card`'s `alarm` emphasis is never used for a request that failed; that is
`Unready`'s job.

### 3. Say who decided, and what the other person got to do about it

A count of reports is a claim about a named person. Every surface that shows one
also says a person reviewed it, and that whoever holds the number had seven days
to answer before it appeared.

The reported party's own page states **nothing has been published** above the
accusation rather than below it, because somebody reading an SMS about
themselves reads the first sentence and not necessarily the fourth.

### 4. The reporter is never named, to anybody

Not to the reported party, not to a reviewer, not to the reporter's own client
echoing back what they just submitted. `StoredReport.reporterId` is documented
as never returned in any role, the reviewer's view omits it, and the adversarial
route test asserts it appears in no response body from any route.

A reporter whose identity reaches the accused is a reporter who gets a visit,
and after the first one nobody reports anything — which ends the registry.

---

## Depth

Two elevation scales, because a shadow does nothing on a near-black background.
In light a card lifts with a shadow; in dark it lifts by being a lighter
surface. Same token name in both, so no screen has to know which theme it is in.

| Token | Light | Dark | Use |
|---|---|---|---|
| `flat` | no shadow | no shadow | Supporting detail inside a card |
| `raised` | 3 dp, 6% | `surfaceRaised` | The card being read |
| `lifted` | 8 dp, 10% | `surfaceRaised` | The one action a screen wants pressed |

One `accent` card per screen, and only one. More than one primary is none.

## Icons

Drawn in `src/components/Icon.tsx`, on a 24×24 grid at 1.75 stroke with round
caps. **No emoji, ever** — an emoji is font-dependent, renders differently on
every handset Keys targets, and cannot be themed. Mixed stroke weights
are the clearest tell of an interface assembled rather than designed.

Three sizes, as tokens: `sm` (16) for inline glyphs, `md` (20) for controls,
`lg` (28) for the renter face, where a glance has to land.

## Appearance

**Light by default**, with a labelled three-state control — light, dark, or
follow the phone. This is read in Nigerian daylight far more often than in the
dark. See ADR-0007.

The control names the current mode in words as well as an icon. An icon-only
theme toggle is the textbook case of shape and colour carrying meaning alone.

It lives in settings and nowhere else. The renter face has one job, and a
person standing outside a compound is not there to choose a theme.

## Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| `surface` | `#FFFFFF` | `#0C0F14` | Background |
| `surfaceDim` | `#F2F4F7` | `#151A21` | Cards |
| `outline` | `#D8DDE4` | `#252D37` | Dividers |
| `textPrimary` | `#0C1119` | `#EBEFF4` | Body |
| `textSecondary` | `#5A6675` | `#9BA7B5` | Labels |
| `accent` | `#1A4FA0` | `#5B93E0` | Primary action |
| `clear` | `#1B7F4B` | `#4FBF84` | Nothing upheld; a verified agent |
| `caution` | `#B4690E` | `#E0A44A` | Under review, awaiting a reply |
| `offline` | `#6E7B8A` | `#8A96A5` | The app could not ask — **never red** |
| `alarm` | `#B0281F` | `#E8695E` | A report a person upheld, and nothing else |
| `verifiedTier` | `#1A4FA0` | `#5B93E0` | Verified badge |
| `businessTier` | `#1B7F4B` | `#4FBF84` | Business badge |
| `trustedTier` | `#9A6B12` | `#D6A93F` | Trusted badge |

Colour never carries meaning alone. Every state that has a colour also has a
label or an icon, because this is read in Nigerian daylight on a cheap screen
far more often than anywhere comfortable.

These four were `moving`, `stopped`, `stale` and `exception` when the palette
arrived from the previous project, where they described trucks. A token whose
name describes another product is a token somebody will use for the wrong
thing.

---

## Typography

**Inter, bundled** — not the system face.

iOS gets SF Pro and Android gets Roboto, so the same screen has different
metrics on each and neither is the one the spacing was set against. On the
Transsion handsets that dominate the segment Keys is built for, "the system face" is
whatever the OEM shipped. Bundling one face is the difference between an app
that was designed and one that was assembled.

Four static weights are linked (`assets/fonts`, via `react-native.config.js`).
**Weights are named, not numbered:** React Native maps `fontWeight` onto a
family's faces inconsistently across platforms, and setting it alongside a
named face produces synthetic bolding on Android that looks like a rendering
fault. `fontFamily: family.semibold`, never `fontWeight: '600'`.

`Menlo`, tabular, for figures that change in place — times, settlement columns,
distances mid-trip. **Not** for a figure with a unit after it: Menlo sets a
full space before the unit, and "764  km" was shipped twice before that was
noticed.

| Style | Size / Line | Use |
|---|---|---|
| `display` | 34 / 40 | The ETA; the rate on a bid |
| `headline` | 26 / 32 | Screen titles |
| `title` | 19 / 25 | Card titles |
| `body` | 16 / 24 | Default |
| `bodyOutdoor` | 19 / 28 | Renter face default — read at arm's length, in the sun |
| `label` | 14 / 20 | Metadata |
| `mono` | 16 / 22 tabular | Plates, rates, weights |

Tabular figures are not a nicety. A rate that shifts horizontally as its digits
change is a rate that looks like it is being edited while you read it.

---

## Motion

One set of durations and two curves, so everything moves at the same rhythm.
Mixed timings are the same tell as mixed stroke widths.

| Token | ms | Used for |
|---|---|---|
| `fast` | 140 | A press, a tint, a chip |
| `base` | 220 | A card, a sheet, a banner |
| `slow` | 320 | A screen transition, and nothing longer |
| `stagger` | 40 | Per item as a list arrives, capped at six |

Exits run at about 70% of the entrance: a thing leaving should get out of the
way, and a slow exit reads as the app hesitating.

**Transform and opacity only.** Both run off the main thread, which matters on
a 2 GB handset. A list row uses opacity rather than scale — a scaling row
nudges its neighbours and the whole list twitches under the thumb.

## Voice

Plain and operational. Say what happened and what it means for the reader.

- **Never blame the reader for the network.** "We cannot reach Keys. Your
  reports are still there; this phone cannot see them right now." Never "no
  reports found".
- **A refusal explains what would fix it.** Every refusal in the domain carries
  a `detail` sentence written to be rendered directly. "The reported party has
  7 days left to answer. A report cannot be upheld before then unless they have
  already replied."
- **Say what a clean result does not mean**, in the same breath as the number —
  not in a footnote. "No upheld reports" and "safe" are not the same sentence,
  and the reader will hear the second unless told otherwise.
- **Never imply guilt the process has not established.** "Reported" is not
  "scammer". Nothing is upheld until a person upheld it, and the copy says who
  that was and what the other party got to do about it.
- **No exclamation marks.** Nobody reading about a number that took their
  ₦20,000 needs enthusiasm.

---

## Definition of done for anything visual

- [ ] Light and dark both authored
- [ ] 200% text scaling without truncation — **check it, do not assume it**.
      Display type is capped (`MAX_SCALE` in `Text.tsx`) and body text is not:
      body is what a low-vision user needs bigger, and a 36 pt hero at 310% is
      112 pt and fills a screen. Icons beside wrapping text are top-aligned, or
      they float in the gap between lines two and three
- [ ] Every card is a `Card`, every glyph an `Icon`, every colour a token —
      no screen defines its own padding, radius, border or hex
- [ ] Screen-reader labelled; colour never the sole carrier of meaning
- [ ] Every error path has a forward path — no dead ends
- [ ] Renter-face targets at 64 dp, agent and reviewer at 48 dp
- [ ] Verified on a physical low-end Android (Tecno or Infinix, 2 GB RAM)
- [ ] Copy read against the voice rules above
- [ ] **Every string through `say()`**, and written in all four languages —
      not English with three placeholders. `make untranslated` fails the build
      on a screen that ships one language, and the domain's own test fails on a
      table filled in by copying English
- [ ] **Nothing the app could not verify is rendered as a fact.** A failed
      request is `unreachable`, never zero, never empty, never grey text saying
      "none"
