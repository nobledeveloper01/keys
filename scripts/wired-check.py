"""
Finds code that is written, tested, and called by nothing.

Run it with the other gates: `python3 scripts/wired-check.py`.

**Four times in one project.** `Tracker` — the capture loop, the thing the
whole product was built around — was complete and had seven tests, and nothing
ever called `start()`. `permissions.ts` was complete and had nine tests, and
nothing ever asked for a permission. `registerDevice` was written on the client
and proven over the wire by the round-trip, and nothing in the app registered a
device. Sealing a proof of delivery was written, tested and reachable from
nowhere — a driver finishing a delivery and not being paid. Every one of them
had a screen describing what it did.

None of the other gates ask this question. `tsc` proves the types line up; an
export nobody imports type-checks perfectly. The tests prove a rule is correct;
a rule that is correct and never applied is exactly the defect.

Four rules, all narrow enough to be worth failing a build over:

1. A module under `apps/mobile/src/native` or `.../state` whose exports are
   imported only by tests. These are the seams, and a seam nobody is on the
   other side of does nothing.
2. A method on the object `client()` returns in `packages/api` with no caller
   outside that package. Every one of them is a route somebody built on the
   server, and a client method nothing calls is a feature that exists on paper.
3. Anything `packages/domain` exports whose name appears nowhere but its own
   definition. The domain is the package every surface imports, which is
   exactly why dead weight accumulates in it.
4. An export under `state/`, `native/` or `screens/` that nothing else names.

All four are allowed the same escape hatch — `wired-check: <reason>` on the
line directly above the declaration — because a seam can legitimately land
before its caller. The reason is the point: it makes the gap a decision
somebody wrote down rather than a thing nobody noticed.

## This file had the defect it exists to find

Rule 2 was inherited from the previous project and pointed at
`apps/mobile/src/api/client.ts`, a path that does not exist in this repository.
It returned an empty list on every run, for a whole phase, while the generated
client grew. `scanned_nothing()` was written after that lesson and did not
cover this rule\'s own root — so the liveness check missed the rule the
liveness check existed for. It covers every root now, and that is the only
reason this is not still true.
"""

import pathlib
import re
from typing import Dict, Optional, Set
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'apps/mobile/src'
# The app entry sits beside `src`, not inside it, and it is the only consumer
# of the providers. Scanning only `src` reported `LanguageProvider` as a seam
# nothing was on the other side of while `App.tsx` was mounting it.
MOBILE_ROOT = ROOT / 'apps/mobile'
TESTS = ROOT / 'apps/mobile/__tests__'

SERVER_SRC = ROOT / 'apps/server/src'
DOMAIN_SRC = ROOT / 'packages/domain/src'
WEB_SRC = ROOT / 'apps/web/src'
API_SRC = ROOT / 'packages/api/src'

EXEMPT = 'wired-check:'

TS_COMMENT_PREFIXES = ('*', '/**', '//', '*/')


def sources() -> list[pathlib.Path]:
    return sorted(p for p in SRC.rglob('*.ts*') if p.is_file())


def body(path: pathlib.Path) -> str:
    return path.read_text()


def exempted_above(
    text: str,
    index: int,
    prefixes: tuple[str, ...] = TS_COMMENT_PREFIXES,
) -> bool:
    """Whether a `wired-check:` comment sits directly above `index`.

    Directly, not nearby. The first version looked back five hundred
    characters and split on blank lines, which meant a method inherited its
    neighbour's exemption — so removing one reason to check the gate still
    fired proved nothing, because the method above it was still carrying one.
    A guard nobody has watched fail is a guard nobody knows works.
    """
    lines = text[:index].split('\n')
    # Skip the declaration's own line, then any doc comment lines, and require
    # the marker before the first line that is neither.
    for line in reversed(lines[:-1] if lines else []):
        stripped = line.strip()
        if EXEMPT in stripped:
            return True
        if stripped.startswith(prefixes) or stripped == '':
            continue
        return False
    return False


def unwired_modules() -> list[str]:
    """Seams under `native/` and `state/` that only tests import."""
    found = []
    for path in sources():
        rel = path.relative_to(SRC).as_posix()
        if not (rel.startswith('native/') or rel.startswith('state/')):
            continue

        text = body(path)
        if EXEMPT in text:
            continue

        stem = path.stem
        importers = [
            other
            for other in sources()
            if other != path and re.search(rf"from '[^']*{re.escape(stem)}'", body(other))
        ]
        if importers:
            continue

        # A file nothing under `src` imports. If a test does, it is the exact
        # shape this check exists for; if nothing does at all, it is dead.
        tested = any(
            re.search(rf"from '[^']*{re.escape(stem)}'", t.read_text())
            for t in TESTS.rglob('*.ts*')
        ) if TESTS.exists() else False

        found.append(
            f'{rel} — imported by {"tests only" if tested else "nothing at all"}'
        )
    return found


def unwired_client_methods() -> list[str]:
    """Methods on the generated client that nothing outside `packages/api` calls.

    The client is the one place where a whole feature can be complete on both
    sides and joined to nothing: the server has the route, the OpenAPI document
    has the path, `api-fresh` is green, and no screen ever calls it.

    Nested groups (`review.queue`) are matched as well as top-level methods,
    because that is where the console's calls live.
    """
    index = API_SRC / 'index.ts'
    if not index.exists():
        return []

    text = body(index)
    factory = re.search(r'export function client\(options: ClientOptions\) \{', text)
    if not factory:
        return []

    # Only the methods on the returned object, not every function in the file.
    returned = text[factory.start():]
    methods = re.findall(r'^\s{4,6}(\w+):\s*(?:\([^)]*\)|async)', returned, re.M)

    callers = [
        p
        for root in (SRC, WEB_SRC, SERVER_SRC)
        if root.exists()
        for p in root.rglob('*.ts*')
        if p.is_file()
    ] + [p for p in MOBILE_ROOT.glob('*.ts*') if p.is_file()]
    joined = '\n'.join(body(p) for p in callers)

    found = []
    for name in sorted(set(methods)):
        declaration = re.search(rf'^\s{{4,6}}{re.escape(name)}:', returned, re.M)
        if declaration and exempted_above(returned, declaration.start()):
            continue
        if re.search(rf'\.{re.escape(name)}\s*\(', joined):
            continue
        found.append(f'client().{name}() — no caller outside packages/api')
    return found


DOMAIN_EXPORT_RE = re.compile(
    r'^export\s+(?:async\s+)?'
    r'(?:function|const)\s+'
    r'([A-Za-z_][A-Za-z0-9_]*)',
    re.MULTILINE,
)


def _symbols_under(root: pathlib.Path) -> dict:
    """
    Every value the domain exports, with the file it lives in and where its
    definition starts.

    Types are deliberately absent. A type is used structurally by callers who
    never write its name, so "nobody names it" says nothing about whether it is
    doing work — and a gate that is wrong about a whole category is a gate
    people learn to skip.
    """
    symbols = {}
    for path in sorted(root.rglob('*.ts*')):
        if not path.is_file() or path.name == 'index.ts':
            continue
        text = body(path)
        for match in DOMAIN_EXPORT_RE.finditer(text):
            symbols[match.group(1)] = {
                'path': path,
                'text': text,
                'start': match.start(),
                'line': text.count('\n', 0, match.start()) + 1,
                'exempt': exempted_above(text, match.start()),
            }
    return symbols


def unwired_domain_exports() -> list[str]:
    """
    Anything `packages/domain` exports whose name appears nowhere but its own
    definition.

    The domain is the one package both the phone and the server import, which
    is exactly why dead weight accumulates in it: a rule written here type-
    checks, tests green, and is called by nobody.

    The rule is deliberately the narrow one. An earlier draft walked the call
    graph and refused to count same-file callers, and it named the four
    vocabulary tables — which a private `TABLES` const holds together — as
    dead. A gate that is wrong about live code is a gate people learn to skip,
    so this asks only the question it can answer without being wrong: does
    anything, anywhere, ever write this name down again?

    What it therefore misses: two dead helpers that call each other. That is a
    real hole and it is the price of never crying wolf.

    A test is not a caller. A rule proved and never applied is precisely the
    defect this gate exists to name.
    """
    return _unwired_under(
        DOMAIN_SRC,
        'exported by the domain and named by nothing else in the codebase',
    )


# The seams. A hook or a native module nobody calls is the same defect as a
# domain rule nobody applies, and the module-level version of this rule missed
# three dead exports in `state/server.tsx` because one type in the same file
# was imported.
SEAMS = [
    ROOT / 'apps/mobile/src/state',
    ROOT / 'apps/mobile/src/native',
    # Screens, but deliberately not components.
    #
    # A screen nothing routes to is dead by definition. A *component* built
    # ahead of the screen that will hold it is what a design system is for, and
    # a gate that demanded every component have a caller would force the set to
    # be deleted and rewritten one screen at a time.
    #
    # The cost of that distinction is real and worth writing down: `ThemeToggle`
    # sat unmounted through the whole of phase 1, which meant the dark half of
    # the palette had never once been on a screen. It is checked by eye in the
    # design review instead, and the roadmap carries it as open until the
    # settings screen mounts the toggle.
    ROOT / 'apps/mobile/src/screens',
]


def unwired_seam_exports() -> list[str]:
    found: list[str] = []
    for root in SEAMS:
        if not root.exists():
            continue
        found += _unwired_under(root, 'a seam nothing is on the other side of')
    return found


def _unwired_under(root: pathlib.Path, label: str) -> list[str]:
    symbols = _symbols_under(root)
    if not symbols:
        return []

    searched = [
        p
        # The web was missing from this list. A domain rule applied only by the
        # web surface would have been reported as dead, and the fix somebody
        # reached for under time pressure would have been to delete it.
        for scan in (SRC, SERVER_SRC, DOMAIN_SRC, WEB_SRC, API_SRC)
        if scan.exists()
        for p in scan.rglob('*.ts*')
        if p.is_file()
    ] + [
        p
        for p in MOBILE_ROOT.glob('*.ts*')
        if p.is_file()
    ]

    found = []
    for name, info in sorted(symbols.items()):
        if info['exempt']:
            continue

        pattern = re.compile(rf'\b{re.escape(name)}\b')
        uses = 0
        for path in searched:
            text = body(path)
            if path == info['path']:
                # Its own definition does not vouch for it. Everything else in
                # its own file does.
                text = text[: info['start']] + text[info['start'] + len(name) + 40 :]
            uses += len(pattern.findall(text))
            if uses:
                break

        if not uses:
            rel = info['path'].relative_to(ROOT)
            found.append(f"{name} — {rel}:{info['line']} — {label}")
    return found


def scanned_nothing() -> list[str]:
    """
    The gate's own liveness check.

    Every root this script reads was correct for a different repository once.
    When one of them stops existing the rule that used it silently reports
    clean, and a clean report from a rule that scanned nothing is worse than
    no rule: it is a green tick over unexamined code. Twice now a guard in this
    codebase has passed that way. This makes it fail instead.
    """
    empty = [
        str(root.relative_to(ROOT))
        for root in (SRC, SERVER_SRC, DOMAIN_SRC, WEB_SRC, API_SRC)
        if not root.exists() or not any(root.rglob('*.ts*'))
    ]
    return [
        f'{root} — this gate scanned nothing here; the path is wrong or the code moved'
        for root in empty
    ]


def main() -> int:
    problems = (
        scanned_nothing()
        + unwired_modules()
        + unwired_client_methods()
        + unwired_domain_exports()
        + unwired_seam_exports()
    )

    if not problems:
        print('everything exported is wired to something')
        return 0

    print('written, tested, and called by nothing:')
    for line in problems:
        print(f'  {line}')
    print()
    print("wire it, delete it, or write `wired-check: <reason>` above it and say why")
    return 1


if __name__ == '__main__':
    sys.exit(main())
