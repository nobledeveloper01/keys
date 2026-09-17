# 9. A tenancy records money and never touches it

Date: 2026-09-17

## Status

Accepted

## Context

Phase 7 is tenancy: the agreement, the rent schedule, receipts, maintenance,
the condition record, the landlord's portfolio. Three of those six are about
money, and the obvious product — the one every competitor builds — collects
the rent: a pay button, a wallet, a payout to the landlord, a margin on the
way through.

That product is a different company. Holding rent makes Keys a regulated
payments business with a licence, a float, a reconciliation team and a
breach surface, and it puts the platform's income on the same side of the
table as the landlord's. It also breaks rule 4 in `CLAUDE.md`, which says
the schema has no transaction columns, and which the profile README and the
public write-up repeat.

The tempting middle — *record a payment, but let the landlord "request" one
through Keys* — is the same product with a delay. A request that Keys sends
is a demand Keys made.

## Decision

**A tenancy in Keys is a record. Keys never collects, holds, transfers,
requests or reminds anybody to pay it.**

- The rent schedule is generated from the agreement and shown to both
  parties. A reminder at 30, 14 and 7 days says a date is coming. It never
  says *pay*, never carries an account number, and is never sent on the
  landlord's behalf — it is the tenant's own phone reading its own schedule.
- A payment is **recorded** by the letting side as received, in kobo, on a
  date, against a period; the tenant sees it at once; the receipt is a
  document both hold. A tenant may **dispute** a recorded amount with a note.
  Nothing in the record can be edited; a correction is a new entry.
- The schema has no transaction, balance, wallet or payout column. A
  "balance" on a screen is arithmetic over recorded payments against the
  schedule, computed in the domain, and labelled *recorded*.
- Copy is gated: `make copy-check` is extended with *pay now*, *pay through
  Keys*, *wallet*, *escrow*, *we hold*, *secure your deposit* and their
  variants, and fails the build on any of them.

## Consequences

- Keys earns from the landlord's subscription and nothing else on this path,
  which is the pricing the PRD already set.
- A landlord who wants collection uses their bank. A tenant who wants proof
  of paying has the receipt, which is what the dispute needs.
- The word *balance* stays out of the product; *recorded so far* and *due on*
  are what the screens say.
