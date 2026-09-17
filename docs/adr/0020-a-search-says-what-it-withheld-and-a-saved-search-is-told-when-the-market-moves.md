# 20. A search says what it withheld, and a saved search is told when the market moves

Date: 2026-09-17

## Status

Accepted

## Context

Keys has fewer listings than any portal it competes with, on purpose: a
listing without a signed capture and a live authority is not shown. The
number that is not shown is the argument for the product, and today it is
thrown away — the search narrows in SQL, the domain decides, and the ones
the domain refused vanish without a count.

And a search is a moment. A tenant looks tonight, finds nothing, and looks
again next week by retyping the same box. What moved in between — a new
listing, a price that dropped, the same flat back under a different agent
at a different price — is the signal worth acting on, and nothing keeps it.

## Decision

**Every search result carries the count it withheld and why, in the words
of the publication rule.** Not the listings themselves — they were withheld
for a reason — but *nine matched and were not shown, because they could not
be verified*, computed in the same pass that ranks the shown ones.

**A saved search is the box and the answer it last saw.** It lives on the
server under the tenant's account: the parameters, and the ids and prices
the last read returned. On the next read the domain compares: listings that
are new, listings whose price changed and by how much, and listings that
match the perceptual hash of one that was seen before but are now under a
different agent — *the same property reappearing*, which is the one that
matters. There is no push; the saved-searches screen says what moved since
last time, and reading it moves *last time* forward.

**No alerts by SMS or push.** The outbox is for one-time codes and rights of
reply; a market alert is engagement, and a saved search that is read when
the tenant chooses is enough.

## Consequences

Search gains one number and a sentence. A saved search is a small table and
one domain function that is easy to test with two snapshots. The reappearing
property needs the perceptual hash of the listing's capture, which the
server already holds for every listing since Phase 3.
