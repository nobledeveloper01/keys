# 12. A ticket and a tenancy are append-only, and the agreement is a reviewed template

Date: 2026-09-17

## Status

Accepted

## Context

FR-6.4 says a maintenance ticket must not be deletable — *the record is the
point* — and FR-6.2 says the agreement comes from a legally reviewed template
and is e-signed by both. Both are easy to build wrong: a ticket as a row with
a `status` column that anyone with the id can set, and an agreement as a form
whose wording a landlord can type.

## Decision

**A ticket is an append-only history whose state is derived, and a tenancy
is the same.** Every transition — `open → acknowledged → assigned →
in_progress → resolved → closed` — is an event with who and when; the
allowed edges are data the test asserts exactly (as Backhaul's trip is), and
the current state is a fold over the events. Nothing is updated in place;
nothing is deleted; a reopened ticket is a new event on the same history.

**The agreement is a template Keys ships, versioned, with blanks the parties
fill.** The blanks are the property, the parties, the rent, the period, the
deposit and the start date; the clauses are the template's and nobody's to
edit in the app. The template version is on the agreement for ever. Each
party signs the canonical bytes of the filled agreement with their device
key; an agreement signed by one is a draft.

**Legal review of the template is a release gate.** Until a Nigerian
tenancy lawyer has read the shipped template, the agreement screen says, in
words, that the template has not been reviewed and that Keys is not giving
legal advice — the same honesty as Snag's *evidence, not proof* and Harvest's
*a draft, not yet read by a speaker*.

## Consequences

- R17 joins the ledger: the template read by a lawyer. It blocks v1.1, not
  v1.0, because tenancy is v1.1.
- The document vault is not a feature: every signed document is already
  held by both parties in the tenancy record, offline, because the tenancy
  record is what the app stores.
