# 5. A rule this serious lives in three places

Date: 2026-08-30

## Status

Accepted

## Context

[ADR-0002](0002-nothing-is-published-until-a-person-upheld-it.md) says nothing
is published until a person upheld it, and until now that was enforced in one
place — `review()` in the domain, with `publishedFor` filtering on the result.

Every other rule in this codebase is enforced once, deliberately. Duplication is
how the previous project ended up with a C# server mirroring a TypeScript domain
and a generated parity suite holding the two together, and
[ADR-0001](0001-the-server-imports-the-domain-rather-than-mirroring-it.md)
exists to say we are not doing that again.

But those two positions are about *the same rule described twice for two
runtimes*, which drifts. This is different: the rule here is one sentence, and
the question is how many ways there are to get past it.

There are three, and they are not the same kind of mistake:

1. A bug in the review console, or a future endpoint that writes `publishedAt`
   without going through `review()`.
2. A caller who reads reports and forgets to filter them.
3. A migration script, a data fix, or somebody in `psql` at 2am — none of which
   go through the application at all.

## Decision

**The publication rule is enforced in the domain, in the query, and in the
table.**

- `review()` decides. It refuses to uphold inside the reply window, without
  evidence, or twice.
- `publishedFor` filters on `published_at IS NOT NULL` **in the SQL**, so there
  is no way to ask the public read for an unpublished report.
- The `reports` table carries three `CHECK` constraints:
  `reports_only_upheld_is_published`, `reports_reply_window_respected`, and
  `reports_upheld_needs_evidence`. Each one refuses to *store* a row that breaks
  the rule.

This is not the duplication ADR-0001 warns about. Nothing here restates the
policy in a second language for a second runtime — the domain owns the numbers
and the reasoning, and the constraints are the same sentence expressed as
something the database can refuse. If the seven-day window changes, `review()`
changes and the constraint keeps holding, because the constraint compares
`published_at` to `reply_deadline_at` rather than counting days itself.

## Consequences

A constraint violation reaches a caller as a 500 rather than as a considered
refusal, and that is correct: the domain has already refused everything a person
could legitimately be trying to do, so anything the table rejects is a bug in us,
not a mistake by a user. It should be loud.

Each constraint was proved by `INSERT`ing a row that breaks it and watching
Postgres name the constraint it violated, then inserting a legitimate row and
watching it through.

**The suites run against every store.** `no-unreviewed-report-escapes.test.ts`
and `the-public-read-cannot-see-unpublished.test.ts` are parameterised over the
in-memory and Postgres implementations, because a suite that only exercises the
`Map` proves something about a `Map`, and the server that ships is talking to
Postgres where the filters are `WHERE` clauses and a mistake looks completely
different.

`make test` finds a database if one is reachable and **says plainly when it
cannot**, rather than passing quietly on half the coverage. That line was
written after `turbo` silently dropped `KEYS_TEST_DATABASE_URL` — it filters the
environment by default — and the suites ran against a `Map` while the Makefile
was handing them a database. See
[ADR-0004](0004-a-gate-that-cannot-fail-is-not-a-gate.md); this is the same
defect wearing a different hat.
