# 14. An area guide is what tenants answered, shown only above a floor

Date: 2026-09-17

## Status

Accepted

## Context

F-407 asks for area guides: transport, power, water, market access. The
obvious guide is prose somebody at Keys writes about Yaba, which is one
person's afternoon in 2026 presented as the neighbourhood for ever — and
which invites exactly the sentence about *who* lives there that this
product refuses everywhere else.

The information exists, and it belongs to the people paying rent there. A
tenant with a tenancy in an area knows how many hours of power a day it
gets and where the water comes from.

## Decision

**An area guide is the distribution of answers to a fixed set of
multiple-choice questions, given by tenants who hold a tenancy in that
area, shown only once five or more separate tenants have answered.**

- Four questions, each with a closed list of answers: power (hours a day,
  in bands), water (the source), transport (which modes reach it), market
  (how far to a daily market, in bands). No free text anywhere in a guide.
- An area is one of the named areas the city's list carries; a listing
  belongs to the nearest area centre within its city. A tenant may answer
  for the area of a tenancy they hold, once per tenancy, and may change
  their answer; only the latest counts.
- Below five separate tenants the guide says *not enough answers yet* and
  shows nothing — a guide with two answers is two people's opinion wearing
  a chart. Above it the guide shows counts, never a verdict: *14 of 20 say
  under eight hours*, not *poor power*.
- Answers carry no account id in the guide and no date finer than a month;
  a guide can never be walked back to a person.

## Consequences

- A guide exists only where the tenancy product has taken hold, which is the
  honest order: the guide is downstream of retention, not a launch feature.
- A new city starts with no guides, and the screens say so.
