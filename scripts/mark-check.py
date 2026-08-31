#!/usr/bin/env python3
"""
The app and the web draw the same mark, so it must be the same path.

Two copies exist on purpose: one is `react-native-svg` and one is DOM SVG, and
the only thing they could share is thirty characters of path data behind an
import that would make the domain package depend on a drawing.

What is not on purpose is the two drifting. A logo that is subtly different
between the app and the website is the kind of thing nobody reports and
everybody notices.
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
COPIES = [
    ROOT / 'apps/mobile/src/components/Mark.tsx',
    ROOT / 'apps/web/src/components/Mark.tsx',
    # The splash draws the two halves separately so it can turn the key inside
    # the shield. Same geometry, three files.
    ROOT / 'apps/mobile/src/components/MarkParts.tsx',
]


def path_of(file: pathlib.Path) -> str:
    """Every path in the file, joined. The mark is two of them now."""
    found = re.findall(r'd="([^"]+)"', file.read_text())
    if not found:
        print(f'✗ {file.relative_to(ROOT)} has no path — this gate has nothing to compare')
        sys.exit(1)
    # Whitespace differs between formatters; the geometry is what must match.
    return ' | '.join(re.sub(r'\s+', ' ', d).strip() for d in found)


def main() -> int:
    missing = [c for c in COPIES if not c.exists()]
    if missing:
        for c in missing:
            print(f'✗ {c.relative_to(ROOT)} does not exist')
        return 1

    paths = {c: path_of(c) for c in COPIES}
    if len({*paths.values()}) != 1:
        print('✗ the mark is drawn differently in each place:')
        for file, d in paths.items():
            print(f'    {file.relative_to(ROOT)}')
            print(f'      {d[:88]}…')
        return 1

    print(f'the mark is identical in all {len(COPIES)} places')
    return 0


if __name__ == '__main__':
    sys.exit(main())
