# 17. The outbox holds a number for one message, and forgets it when sent

Date: 2026-09-17

## Status

Accepted

## Context

Every phone number in Keys is a hash before it reaches a store, and the
outbox was written to the same rule: `OutboundText` carries `toPhoneHash`
and nothing else. Release gate R12 named the consequence — *no message in
this product can currently be delivered to anybody* — and asked for a
decision between two shapes: store a number beside the hash, or move the
landlord code to a link-with-token the way contact exchange moved to
per-conversation numbers.

A link-with-token does not answer it. The link still has to reach the
landlord, and the only channel that reaches a landlord who has never heard
of Keys is a text message to a number. Contact exchange solved a different
problem: two people who are already talking, one of whom offers a number.

The obvious alternative — a `phone` column on the account — is the thing
the hashing exists to prevent: a directory of who has been reported and who
lets what, readable by anybody who reads the database.

## Decision

**The outbox is the one place a number is written in plain, it is written
there for one message, and it is deleted the moment the message is sent or
given up on.** Every caller that queues a text already holds the number in
plain at that instant — the reporter typed it, the agent typed the
landlord's — so nothing is un-hashed; the number is handed across and the
hash is kept beside it for the record of what was sent to whom.

A sender is an interface with one method. The logging sender that exists
today writes that a message went and the hash it went to, never the number
and never the body's code. A provider, when there is one (R1, R7), is a
second implementation and no change to any caller.

**Retention is the rule, not a job.** A sent message keeps its hash, its
body's length and when; the number is gone from the row. A message the
sender refuses is retried a bounded number of times and then dropped with
its number; a queue that keeps failed numbers forever is the directory
again, built by accident.

## Consequences

R12 is closed by this: the outbox can address a real phone. R1 and R7 stay
open, because closing them means somebody watching a real phone receive a
text, and that needs a provider.

The number's plaintext exists in memory and, under Postgres, in the outbox
table for the seconds between queue and send. That window is the price of
delivering anything, and it is written here so nobody widens it without
noticing.
