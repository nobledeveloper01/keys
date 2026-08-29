# 2. Nothing is published until a person upheld it

Date: 2026-08-29

## Status

Accepted

## Context

Keys' first product is a registry of phone numbers that have scammed people
looking for a place to live. Its whole value is that a stranger can check a
number before they pay an inspection fee. Its whole risk is that the same
mechanism is a machine for publishing accusations about named people, and in
Nigeria an accusation attached to a phone number is an accusation attached to a
person, their business, and their family.

An automatic registry — report goes in, entry comes out — is easy to build and
would be defamatory by design. It would also be trivially weaponised: an agent
who lost a listing to a competitor needs one afternoon and five phone numbers.

So the question is not whether to review. It is how to build the thing such
that skipping review is not an option somebody has on a busy Tuesday.

## Decision

**A report becomes public only through a decision recorded by a person, and
the code is arranged so that no other path exists.**

Concretely:

1. **Publication is an allow-list, not a deny-list.** `PUBLISHABLE` names the
   one status that may be shown. A status invented in a later phase is hidden
   until somebody deliberately adds it. The failure mode of forgetting is
   invisibility, which is a bug report; the failure mode of the inverse is a
   published accusation nobody decided to publish, which is a lawsuit.

2. **`publishedAt` is the single fact the public query filters on**, and the
   filter lives in the query rather than in a caller who applies it
   afterwards. There is no read on the store that returns unpublished reports
   without the reviewer guard.

3. **The reviewer does not decide what is allowed.** The console hands the
   decision to `review()` in the domain, which refuses to uphold a report
   inside the reply window, or without evidence, or twice. A reviewer under
   pressure cannot click past a rule, because the rule is not in the console.

4. **Seven days of right of reply, before publication, not after.** A takedown
   process that runs after publication is a process that runs after the damage.

5. **Retention is a property of the row.** A dismissed report is kept twelve
   months for pattern detection and carries the date it will be deleted.
   Purging happens on the read itself rather than on a schedule, because a cron
   job that quietly stops running is a retention policy that quietly stops
   being true.

## Consequences

Growth is bounded by review throughput. That is the intended trade and phase
1's third exit gate measures it, because a number we do not measure is a number
that becomes a backlog and then becomes an exception.

The gate that holds all of this is `apps/server/test/no-unreviewed-report-escapes.test.ts`.
It does not name the routes it tests — it reads them out of the running router,
so a route added in a later phase is covered on the day it is written, by
somebody who never read this file. It has been proven to fail by removing the
reviewer guard, by leaking the reporter's id, and by adding a debug route that
dumps the store.

**This decision does not make the product lawful.** It makes it defensible.
Phase 1 carries a human gate — legal review of the report policy by a Nigerian
lawyer — and that gate blocks public launch regardless of what any test says.
