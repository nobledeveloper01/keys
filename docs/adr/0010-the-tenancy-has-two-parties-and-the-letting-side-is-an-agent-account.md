# 10. The tenancy has two parties, and the letting side is an agent account

Date: 2026-09-17

## Status

Accepted

## Context

A landlord in this product has so far been a phone number that confirms an
agent's authority by text or by a reviewer's call. That is right for
verification: the landlord is a witness, not a user. Tenancy management is
different — somebody records payments, acknowledges the condition record,
answers maintenance tickets and looks at a portfolio. That somebody needs an
account, and the PRD's P3 persona ("visibility of her own listings, rent
tracking, maintenance records") is a landlord who manages her own flats.

The obvious answer is a third account type. It is also a third KYC path, a
third token, a third guard and a third face on every screen, for a person
who does everything an agent does on one property.

## Decision

**A tenancy has exactly two parties: the tenant account, and the letting
account — an agent account holding current authority over the property.** A
landlord who manages her own flat opens an agent account and confirms her
own authority, which the existing rules already allow only through a
reviewer's call.

- A tenancy can be opened only by the letting account, only on a property it
  holds authority over at that moment, and only for a tenant who accepts it
  on their own phone. Both sides see the same record.
- The tenant's number is never shown to the letting side, and the letting
  side's never to the tenant, except through the conversation rules that
  already exist. The tenancy references accounts, not numbers.
- Losing authority over the property does not end a tenancy already opened:
  the record belongs to the tenant as much as to the letting side, and a
  tenant in a dispute must still have it.

## Consequences

- No new account type, guard or token. The agent guard and the tenant guard
  are enough.
- "Landlord" on a screen means the letting side. The word is kept because it
  is the word people use; the code says `letting`.
