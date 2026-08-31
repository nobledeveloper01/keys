#!/usr/bin/env python3
"""
Both surfaces still match `design/palette.json`.

Colour is the one thing in this product that lives in two runtimes and cannot
be imported across them: the app reads a TypeScript object, the web reads CSS
custom properties. Both are generated, and generated files rot silently — a
hand-tweaked hex in either one is invisible until somebody puts the app and the
site side by side.

So this rebuilds both and diffs. It also re-runs the palette's own contrast and
hue checks, because a source that no longer passes its floors is worse than a
copy that has drifted from it.
"""

import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'design/palette.json'
TOKENS = ROOT / 'apps/mobile/src/design/tokens.ts'
CSS = ROOT / 'apps/web/src/app/globals.css'


def main() -> int:
    if not SOURCE.exists():
        print(f'✗ {SOURCE.relative_to(ROOT)} does not exist — run `make palette`')
        return 1

    # The source has to still pass its own rules.
    built = subprocess.run(
        [sys.executable, str(ROOT / 'scripts/build-palette.py')],
        capture_output=True,
        text=True,
    )
    if built.returncode != 0:
        print(built.stdout or built.stderr, end='')
        return 1

    palette = json.loads(SOURCE.read_text())
    problems = []

    # Every colour the source names must appear in the app's tokens.
    tokens = TOKENS.read_text()
    for theme, roles in palette['themes'].items():
        for role, value in roles.items():
            if value.upper() not in tokens.upper():
                problems.append(f'apps/mobile … tokens.ts is missing {theme}.{role} = {value}')

    # And in the web's generated block.
    css = CSS.read_text()
    match = re.search(
        r'/\* == generated from design/palette\.json.*?/\* == end generated == \*/', css, re.S
    )
    if not match:
        problems.append('apps/web … globals.css has no generated block — run `make palette`')
    else:
        block = match.group(0)
        for theme, roles in palette['themes'].items():
            for role, value in roles.items():
                if value.lower() not in block.lower():
                    problems.append(f'apps/web … globals.css is missing {theme}.{role} = {value}')

    # The gate's own liveness check: a source with no colours in it would
    # satisfy every loop above by having nothing to look for.
    total = sum(len(r) for r in palette['themes'].values())
    if total < 20:
        problems.append(f'the palette defines only {total} roles — that is not this product')

    if problems:
        print('✗ a surface has drifted from design/palette.json:')
        for line in sorted(set(problems))[:14]:
            print(f'    {line}')
        print()
        print("run 'make palette' and commit what it changes — do not hand-edit either file")
        return 1

    print(f'both surfaces match design/palette.json ({total} roles across 2 themes)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
