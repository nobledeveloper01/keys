# 3. The accused answers with a texted capability, not an account

Date: 2026-08-29

## Status

Accepted

## Context

Right of reply is only real if the person can use it. The natural
implementation — sign up, verify your number, view the report, respond — is
the one that makes most people never reply, because the moment of first contact
is an SMS about an accusation, and the ask is to create an account on the
platform hosting it.

A registry whose replies are mostly empty is not a registry with a reply
feature. It is a rumour mill with a defence nobody used, and the emptiness will
look, in front of a court, exactly like what it is.

## Decision

**The reported party receives a random 32-byte token by SMS, and holding it is
the only proof of control over the number this product accepts.**

- The token is stored on the report, generated with `randomBytes`, and is never
  derivable from the report id and never returned by any read.
- It is reachable only through `byReplyToken`, which is a separate store method
  from `byId` so that no route accepting a path parameter can be turned into
  this one by accident.
- It shows the category, the description, the deadline — and never the
  reporter, in any form.
- **A late reply is accepted.** The seven-day deadline governs when a reviewer
  may uphold a report without an answer. It does not govern when a person stops
  being allowed to answer an accusation about them; refusing a late reply would
  leave a published report permanently missing the words of the person it
  names.

## Consequences

A stolen phone is a stolen right of reply. That is the same trust boundary as
every SMS OTP in the country and we accept it knowingly rather than by
omission.

Until phase 3 wires an SMS provider, the token is generated and stored but not
delivered. **The right-of-reply flow is therefore not yet end to end, which is
exit gate 2 of this phase, and it is open.**
