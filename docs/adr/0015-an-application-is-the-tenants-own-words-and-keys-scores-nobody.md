# 15. An application is the tenant's own words, and Keys scores nobody

Date: 2026-09-17

## Status

Accepted

## Context

F-604 and F-605 ask for an application with the renter's profile and
status tracking, and the PRD calls the phase *application and screening
flow*. Screening is the word to be careful with. Every platform that
"screens" tenants ends up with a number — a credit score, an affordability
ratio, a risk band — computed from data the tenant did not give for that
purpose, applied by a landlord who does not know what it means, and
impossible for the tenant to argue with. Rule 4 in `CLAUDE.md` refuses to
handle money; this is the same refusal one step earlier.

## Decision

**An application is a profile the tenant writes about themselves, handed to
one agent for one listing, with a status the agent sets from a closed list
and the tenant always sees. Keys computes nothing about the tenant.**

- The profile is the tenant's own words in fixed fields: occupation,
  household size, when they can move, and a note. Keys adds only facts it
  holds and the tenant can see on their own screen: how long the account
  has existed, and how many tenancies Keys has recorded for it. No score,
  no ratio, no band, and no field named *risk*.
- Statuses: `submitted → seen → shortlisted → offered` or `declined`, and
  `withdrawn` by the tenant at any time. Every change is an event with who
  and when; the tenant sees every one. A declined application carries no
  reason field, because a reason field becomes a discrimination record.
- One open application per tenant per listing. A closed application can be
  followed by a new one.
- The agent sees applications for their own listings only; a listing that
  is no longer published closes its open applications as `declined` by
  nobody — the event says the listing was withdrawn.

## Consequences

- The screening the market wanted is the agent's judgement, and Keys gives
  them the tenant's words to make it with, nothing more.
- Nothing here can be sold to a landlord as a score, which is a product
  Keys will not build.
