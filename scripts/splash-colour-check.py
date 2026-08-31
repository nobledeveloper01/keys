#!/usr/bin/env python3
"""
The native launch screen and the JavaScript splash must be the same colour.

iOS shows a storyboard while the process starts, then React Native takes over
and draws its own field. If the two disagree, every cold start flashes — and
nothing else in this repository can notice, because a storyboard cannot import
a TypeScript constant and no test renders either one.

The template shipped a white storyboard under a coloured splash. It looked like
a rendering bug and it was a build-configuration one.
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
# The constant moved into the generated tokens when the palette became the
# single source; the splash re-exports it, but this reads the definition.
SPLASH = ROOT / 'apps/mobile/src/design/tokens.ts'
STORYBOARD = ROOT / 'apps/mobile/ios/Keys/LaunchScreen.storyboard'


def wanted() -> tuple[float, float, float]:
    text = SPLASH.read_text()
    match = re.search(r"SPLASH_FIELD = '#([0-9a-fA-F]{6})'", text)
    if not match:
        print(f'✗ no SPLASH_FIELD in {SPLASH.relative_to(ROOT)} — this gate has nothing to compare')
        sys.exit(1)
    h = match.group(1)
    return tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))  # type: ignore[return-value]


def found() -> tuple[float, float, float]:
    text = STORYBOARD.read_text()
    match = re.search(
        r'<color key="backgroundColor" red="([\d.]+)" green="([\d.]+)" blue="([\d.]+)"', text
    )
    if not match:
        print(f'✗ {STORYBOARD.relative_to(ROOT)} has no explicit background colour')
        print('  it is probably still the template\'s system background, which is white')
        sys.exit(1)
    return tuple(float(g) for g in match.groups())  # type: ignore[return-value]


def main() -> int:
    a, b = wanted(), found()
    # A tolerance, because the storyboard stores sRGB floats and the constant is
    # eight-bit hex; they will never be bit-identical.
    if max(abs(x - y) for x, y in zip(a, b)) > 0.004:
        print('✗ the launch screen and the splash are different colours — a cold start will flash')
        print(f'    Splash.tsx  rgb {tuple(round(x, 4) for x in a)}')
        print(f'    storyboard  rgb {tuple(round(x, 4) for x in b)}')
        return 1

    # The framework's name is not ours to put on the first frame of the product.
    if 'Powered by React Native' in STORYBOARD.read_text():
        print('✗ the launch screen still advertises React Native')
        return 1

    print('the launch screen and the splash are the same colour')
    return 0


if __name__ == '__main__':
    sys.exit(main())
