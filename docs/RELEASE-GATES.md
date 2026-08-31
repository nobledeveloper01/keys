# Open release gates

Everything here must be true before v1.0 ships. None of it blocks the next
phase — see
[ADR 0007](adr/0007-a-gate-blocks-the-next-phase-or-it-blocks-the-release.md)
for why those are different questions.

**This list is the commitment.** "We will do it before launch" is a sentiment;
this is a ledger. If it grows past what one screen holds, the product is being
built past the point anybody can honestly ship it.

| # | Gate | Waiting on | Expected to clear in |
|---|---|---|---|
| R1 | Right-of-reply works end to end — the texted capability is delivered, not just generated | An SMS provider | Phase 3 |
| R2 | Review console throughput measured against real reports | A reviewer doing the job | Phase 6, Lagos launch |
| R3 | Legal review of the report policy by a Nigerian lawyer | An outside party. **Blocks public launch outright** | Before any public launch |
| R4 | An Android build somebody has watched succeed | A JDK on a build machine | Phase 2 |
| R5 | Dark mode reachable in the app — a settings screen mounts `ThemeToggle` | A settings screen | Phase 2 |

## How a gate leaves this list

By being demonstrated, and by the demonstration being written down where
somebody who was not there can check it. A gate is not cleared because the work
it named was done; it is cleared because somebody watched the thing it was
worried about not happen.
