# Changelog

Everything here is what changed for someone *using* Keys. Internal refactors
that nobody outside can observe do not appear.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
