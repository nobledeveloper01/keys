#!/usr/bin/env python3
"""Every phrase is on a screen, or it is a promise nobody kept.

A phrase in four languages that no surface uses is one of two things, and both
are worth catching. Either a feature was removed and its words were left behind
— harmless clutter that four translators will keep paying for — or the words
went in before the feature and the feature never arrived. This app had
`saved_here_will_send` and `waiting_to_send` sitting in the dictionary for an
offline queue it does not have, and an `OfflineBanner` ready to render "3
waiting to send" over nothing.

That second kind is why this is a gate rather than a lint. Phase 6's exit gate
says the app never claims to have kept something it has not, and a dictionary
full of sentences about keeping things is where that claim starts.

## Phrases built from a template

Several are assembled rather than written: `condition_${c}`, `step_${c}`,
`outcome_${o}`, `tier_${t}`. Searching for the literal finds nothing, and
listing the prefixes here by hand would be the same staleness one level up. So
the prefixes are *discovered* — anything a source file interpolates is a live
prefix, and every phrase starting with it counts as used.
"""

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANGUAGE = ROOT / 'packages/domain/src/language.ts'
SURFACES = [
    'apps/mobile/src',
    'apps/mobile/App.tsx',
    'apps/web',
    'apps/server/src',
]

# Phrases that legitimately have no caller. Each one has to say why, here,
# where somebody deleting it will read the reason.
EXEMPT: dict[str, str] = {}

# What this does *not* catch, said out loud so nobody trusts it too far.
#
# A phrase used only by a component that nothing mounts counts as used. That is
# how `waiting_to_send` survived the first run of this check: `OfflineBanner`
# referenced it, and `OfflineBanner` was referenced by nothing. `wired-check`
# exempts components deliberately — a component with no caller is usually a
# component about to have one — and the two exemptions line up to leave a hole.
# Closing it means teaching one of them about the render tree, which is a bigger
# thing than this file. Until then: a phrase reaching a screen is checked, and a
# screen reaching a person is not.


def read(paths: list[str]) -> str:
    real = [str(ROOT / p) for p in paths if (ROOT / p).exists()]
    found = subprocess.run(
        ['grep', '-rh', '--include=*.ts', '--include=*.tsx', '-e', '', *real],
        capture_output=True,
        text=True,
    )
    return found.stdout


def main() -> int:
    text = LANGUAGE.read_text()
    declared = sorted(set(re.findall(r"^\s*\|\s*'([a-z0-9_]+)'", text, re.M)))
    if not declared:
        print('phrase-check found no phrases — the union moved and this stopped checking')
        return 1

    surfaces = read(SURFACES)

    # Prefixes come from the domain as well as the surfaces, because that is
    # come from the domain as well as the surfaces, because that is where the
    # assembling functions live: `conditionPhrase` returns `condition_${c}` and
    # a screen only ever passes it a value. Usage does *not* come from the
    # domain — a phrase mentioned only in the dictionary that declares it is a
    # phrase on no screen, which is the whole point.
    templated = surfaces + read(['packages/domain/src'])
    prefixes = set(re.findall(r"`([a-z0-9_]+_)\$\{", templated))

    used = set(re.findall(r"[a-z0-9_]+", surfaces))

    dead = [
        phrase
        for phrase in declared
        if phrase not in used
        and phrase not in EXEMPT
        and not any(phrase.startswith(prefix) for prefix in prefixes)
    ]

    if dead:
        print('written in four languages, and on no screen:')
        for phrase in dead:
            print(f'  {phrase}')
        print()
        print('use it, delete it in all four languages, or add it to EXEMPT with a reason')
        return 1

    kept = len(declared) - len(EXEMPT)
    print(f'every phrase reaches a screen ({kept} phrases, {len(prefixes)} built from a template)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
