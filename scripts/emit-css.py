#!/usr/bin/env python3
"""
Turns `design/palette.json` into the web's custom properties.

The web and the app were carrying two hand-maintained copies of the same
colours, and they drifted — three different purples across the splash, the app
and the site. This writes the web's half, so there is one place a colour is
decided and no place it is transcribed.

The generated block is delimited in `globals.css`; everything outside the
markers is hand-written and left alone.
"""

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSS = ROOT / 'apps/web/src/app/globals.css'
START = '/* == generated from design/palette.json — do not edit == */'
END = '/* == end generated == */'

ORDER = [
    ('bg', 'surface'),
    ('surface', 'surfaceDim'),
    ('surface-raised', 'surfaceRaised'),
    ('line', 'outline'),
    ('ink', 'textPrimary'),
    ('ink-quiet', 'textSecondary'),
    ('accent', 'accent'),
    ('accent-ink', 'onAccent'),
    ('accent-wash', 'accentWash'),
    ('clear', 'clear'),
    ('clear-wash', 'clearWash'),
    ('caution', 'caution'),
    ('caution-wash', 'cautionWash'),
    ('offline', 'offline'),
    ('offline-wash', 'offlineWash'),
    ('alarm', 'alarm'),
    ('alarm-wash', 'alarmWash'),
]


def block(palette: dict) -> str:
    light, dark = palette['themes']['light'], palette['themes']['dark']
    stops = ', '.join(f'{c} {round(i / (len(palette["gradient"]) - 1) * 100)}%'
                      for i, c in enumerate(palette['gradient']))

    lines = [START, ':root {']
    lines += [f'  --{name}: {light[key].lower()};' for name, key in ORDER]
    lines.append(f'  --brand-gradient: linear-gradient(140deg, {stops});')
    control = ', '.join(
        f'{c} {round(i / (len(palette["controlGradient"]) - 1) * 100)}%'
        for i, c in enumerate(palette['controlGradient'])
    )
    lines.append('  /* Darker, because sixteen-point text sits on it. */')
    lines.append(f'  --control-gradient: linear-gradient(140deg, {control});')
    lines.append('  /* A stronger line for controls, so a field edge is visible on white. */')
    lines.append(f"  --line-strong: {light['outline'].lower()};")
    lines.append('}')
    lines.append('')
    lines.append('@media (prefers-color-scheme: dark) {')
    lines.append('  :root {')
    lines += [f'    --{name}: {dark[key].lower()};' for name, key in ORDER]
    lines.append(f"    --line-strong: {dark['outline'].lower()};")
    lines.append('  }')
    lines.append('}')
    lines.append(END)
    return '\n'.join(lines)


def storyboard(palette: dict) -> None:
    """
    The native launch screen's background, from the same source.

    A storyboard cannot import anything, so this is the third place the colour
    has to be written and the third that would drift. `splash-colour-check.py`
    holds it to the constant; this keeps it from ever being wrong in the first
    place.
    """
    board = ROOT / 'apps/mobile/ios/Keys/LaunchScreen.storyboard'
    if not board.exists():
        return
    flat = palette['gradientFlat'].lstrip('#')
    r, g, b = (int(flat[i : i + 2], 16) / 255 for i in (0, 2, 4))
    text = board.read_text()
    text = re.sub(
        r'<color key="backgroundColor" red="[\d.]+" green="[\d.]+" blue="[\d.]+"',
        f'<color key="backgroundColor" red="{r:.17f}" green="{g:.17f}" blue="{b:.17f}"',
        text,
    )
    board.write_text(text)


def main() -> int:
    palette = json.loads((ROOT / 'design/palette.json').read_text())
    storyboard(palette)
    css = CSS.read_text()
    generated = block(palette)

    if START in css:
        css = re.sub(re.escape(START) + r'.*?' + re.escape(END), generated, css, flags=re.S)
    else:
        # First run: put it at the top, before anything that uses a token.
        css = generated + '\n\n' + css

    CSS.write_text(css)
    print(f'wrote {len(ORDER) * 2 + 3} custom properties into {CSS.relative_to(ROOT)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
