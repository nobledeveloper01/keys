#!/usr/bin/env python3
"""Documents that state a fact must state the one that is true.

`doc-check.sh` already asks whether the documents *exist* and are tracked and
carry their headings. This asks a different question: whether what they say is
still so.

Six phases of building left the specification series describing a product that
had moved. `07-BACKEND-SPEC.md` named five routes; forty-two existed. Documents
claimed seven Verified conditions, and elsewhere eight, when there were nine. A
reader cannot tell a stale document from a current one by looking at it, which
makes a confidently wrong document worse than a missing one.

## What this can and cannot check

Only facts with a single mechanical source: the number of conditions, the routes
the server actually serves, the phase the repo is in. Prose about *why* is not
checkable and is not checked — the journal and the ADRs are the record of
reasoning and they are allowed to describe the past, because they are dated and
say so.

The rule this encodes: **a document may describe intent freely, and may not
state a fact the code contradicts.**
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Documents that describe the past on purpose. A journal entry saying "seven
# conditions" was true when it was written and is part of the record.
HISTORICAL = {"docs/JOURNAL.md", "CHANGELOG.md"}

WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
}


def documents() -> list[Path]:
    found = [*ROOT.glob("docs/**/*.md"), *ROOT.glob("*.md")]
    return [p for p in found if str(p.relative_to(ROOT)) not in HISTORICAL]


def real_conditions() -> int:
    source = (ROOT / "packages/domain/src/listings.ts").read_text()
    block = source[source.index("VERIFIED_CONDITIONS = ["):]
    block = block[: block.index("] as const")]
    return len(re.findall(r"^\s*'[a-z_]+',", block, re.M))


def real_routes() -> set[str]:
    document = json.loads((ROOT / "packages/api/openapi.json").read_text())
    return set(document["paths"])


def main() -> int:
    problems: list[str] = []

    conditions = real_conditions()
    routes = real_routes()

    for path in documents():
        relative = str(path.relative_to(ROOT))
        text = path.read_text()

        # "the seven conditions", "all eight Verified conditions"
        for match in re.finditer(
            r"\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+"
            r"(?:\*\*)?(?:Verified\s+)?conditions?\b",
            text,
            re.I,
        ):
            claimed = WORDS[match.group(1).lower()]
            if claimed != conditions:
                line = text[: match.start()].count("\n") + 1
                problems.append(
                    f"{relative}:{line} says {match.group(0)!r}, "
                    f"but VERIFIED_CONDITIONS has {conditions}"
                )

        # Routes a document names that the server does not serve.
        #
        # The lookbehind excludes a preceding word character or slash, so a
        # path like `packages/api/v1/...` is not read as a route. It used to
        # exclude a backtick too, which meant it matched nothing at all in
        # practice — every document writes routes in backticks — and the route
        # half of this check silently passed on a deliberately broken document.
        for match in re.finditer(r"(?<![\w/])`?(/v1/[a-zA-Z0-9/{}:_-]+)", text):
            named = match.group(1).rstrip(".,;:)")
            # Documents write `:id` where OpenAPI writes `{id}`.
            normalised = re.sub(r":([a-zA-Z][a-zA-Z0-9]*)", r"{\1}", named)
            if normalised in routes:
                continue
            # A prefix somebody is describing as a group, not a route.
            if any(route.startswith(normalised.rstrip("/") + "/") for route in routes):
                continue
            line = text[: match.start()].count("\n") + 1
            problems.append(f"{relative}:{line} names {named}, which the server does not serve")

    if problems:
        print("documents stating something the code contradicts:")
        for problem in sorted(set(problems)):
            print(f"  {problem}")
        print()
        print("correct it, or move the claim into a dated record that is allowed to describe the past")
        return 1

    print(f"every checkable claim matches the code ({conditions} conditions, {len(routes)} routes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
