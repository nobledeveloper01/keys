#!/usr/bin/env python3
"""
The palette, decided once and proven before it is written.

Colour was being chosen per surface — a hex picked for the app's splash, another
for the web's accent, a third for a card — and the three drifted because nothing
connected them. This builds every value from five hue ramps, assigns the
semantic roles, checks every pairing the product actually renders, and refuses
to emit anything if a pair falls below its WCAG floor.

`design/palette.json` is the output and the single source. The app imports it;
`scripts/emit-css.py` turns it into the web's custom properties. Neither is
edited by hand.
"""

import colorsys
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# --- the ramps ------------------------------------------------------------
#
# Five hues, each far enough from the others that no two roles can be confused
# at a glance. Brand sits at 249°, which is clear of clear (156°), caution
# (39°) and alarm (348°) — an accent near a status hue makes a button look like
# a verdict.
HUES = {
    'brand': (249, 0.78),
    'slate': (240, 0.13),
    'clear': (156, 0.72),
    'caution': (39, 0.86),
    'alarm': (348, 0.72),
}

STEPS = {
    50: 0.965, 100: 0.925, 200: 0.855, 300: 0.755, 400: 0.655,
    500: 0.575, 600: 0.485, 700: 0.395, 800: 0.295, 900: 0.195, 950: 0.115,
}


def build_ramps() -> dict:
    ramps = {}
    for name, (hue, sat) in HUES.items():
        steps = dict(STEPS)
        # The neutral goes darker at the bottom; it is the app's background.
        if name == 'slate':
            steps[950] = 0.045
        ramps[name] = {
            str(k): '#%02X%02X%02X'
            % tuple(round(c * 255) for c in colorsys.hls_to_rgb(hue / 360, l, sat))
            for k, l in steps.items()
        }
    return ramps


# --- contrast -------------------------------------------------------------

def luminance(value: str) -> float:
    h = value.lstrip('#')
    channels = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    channels = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]


def contrast(a: str, b: str) -> float:
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def over(top: str, alpha: float, bottom: str) -> str:
    """What a translucent surface actually composites to."""
    t = [int(top.lstrip('#')[i : i + 2], 16) for i in (0, 2, 4)]
    b = [int(bottom.lstrip('#')[i : i + 2], 16) for i in (0, 2, 4)]
    return '#%02X%02X%02X' % tuple(round(t[i] * alpha + b[i] * (1 - alpha)) for i in range(3))


def themes(r: dict) -> dict:
    """
    The semantic roles.

    Surfaces are composited here rather than left as overlays, so every figure
    checked below is the one a reader actually sees.
    """
    light_bg = '#FFFFFF'
    dark_bg = r['slate']['950']

    return {
        'light': {
            'surface': light_bg,
            'surfaceDim': over(r['slate']['500'], 0.07, light_bg),
            'surfaceRaised': light_bg,
            'outline': over(r['slate']['500'], 0.20, light_bg),
            'textPrimary': r['slate']['950'],
            'textSecondary': r['slate']['700'],
            'accent': r['brand']['700'],
            'onAccent': '#FFFFFF',
            'accentWash': over(r['brand']['500'], 0.10, light_bg),
            'clear': r['clear']['800'],
            'clearWash': over(r['clear']['500'], 0.13, light_bg),
            'caution': r['caution']['800'],
            'cautionWash': over(r['caution']['500'], 0.16, light_bg),
            'alarm': r['alarm']['800'],
            'alarmWash': over(r['alarm']['500'], 0.12, light_bg),
            'offline': r['slate']['700'],
            'offlineWash': over(r['slate']['500'], 0.11, light_bg),
        },
        'dark': {
            'surface': dark_bg,
            'surfaceDim': over('#FFFFFF', 0.055, dark_bg),
            'surfaceRaised': over('#FFFFFF', 0.085, dark_bg),
            'outline': over('#FFFFFF', 0.14, dark_bg),
            'textPrimary': r['slate']['50'],
            'textSecondary': r['slate']['400'],
            'accent': r['brand']['300'],
            'onAccent': dark_bg,
            'accentWash': over(r['brand']['500'], 0.16, dark_bg),
            'clear': r['clear']['400'],
            'clearWash': over(r['clear']['500'], 0.13, dark_bg),
            'caution': r['caution']['400'],
            'cautionWash': over(r['caution']['500'], 0.14, dark_bg),
            'alarm': r['alarm']['400'],
            'alarmWash': over(r['alarm']['500'], 0.14, dark_bg),
            'offline': r['slate']['400'],
            'offlineWash': over(r['slate']['500'], 0.12, dark_bg),
        },
    }


def check(theme: dict, name: str) -> list:
    """
    Every pairing the product renders, at the ratio its size requires.

    4.5:1 for body, 3:1 for the display-size count — which is the only large
    text that carries a status colour.
    """
    problems = []

    def want(fg: str, bg: str, need: float, what: str) -> None:
        got = contrast(theme[fg], theme[bg])
        if got < need:
            problems.append(f'{name}: {what} — {theme[fg]} on {theme[bg]} is {got:.2f}:1, needs {need}')

    for surface in ('surface', 'surfaceDim', 'surfaceRaised'):
        want('textPrimary', surface, 4.5, f'body text on {surface}')
        want('textSecondary', surface, 4.5, f'secondary text on {surface}')
        want('accent', surface, 4.5, f'a link on {surface}')

    # A status colour is used as body text on its own wash, and as the large
    # count. The wash is the harder of the two.
    for status in ('clear', 'caution', 'alarm', 'offline'):
        want(status, f'{status}Wash', 4.5, f'{status} text on its wash')
        want('textPrimary', f'{status}Wash', 4.5, f'body text on the {status} wash')

    want('onAccent', 'accent', 4.5, 'a button label on the accent')
    return problems


def hues_are_separated() -> list:
    """
    The brand must not sit on a status hue.

    An accent within a few degrees of `alarm` makes every primary button read as
    a warning, and one near `clear` makes it read as a verdict already reached.
    Contrast cannot see this — a brand at 348° passes every ratio in the file
    and is still the wrong colour — so it is checked separately.

    Forty degrees is the floor. The four statuses are at 156, 39, 348 and, for
    the neutral, whatever `slate` is; slate is excluded because at 13%
    saturation it reads as grey rather than as a hue.
    """
    brand = HUES['brand'][0]
    problems = []
    for name, (hue, sat) in HUES.items():
        if name in ('brand', 'slate'):
            continue
        gap = min(abs(brand - hue), 360 - abs(brand - hue))
        if gap < 40:
            problems.append(
                f'brand at {brand}° is {gap}° from {name} at {hue}° — a button will read as a verdict'
            )
    return problems


def main() -> int:
    ramps = build_ramps()
    built = themes(ramps)

    problems = hues_are_separated() + check(built['light'], 'light') + check(built['dark'], 'dark')
    if problems:
        print('✗ the palette does not meet its own contrast floors:')
        for line in problems:
            print(f'    {line}')
        print()
        print('adjust the hues or ramp steps in HUES/STEPS — do not hand-edit the output')
        return 1

    out = {
        'ramps': ramps,
        'themes': built,
        # The brand gradient, and the flat colour a native launch screen uses in
        # its place. The midpoint, so the hand-over does not flash.
        'gradient': [ramps['brand']['400'], ramps['brand']['500'], ramps['brand']['800']],
        'gradientFlat': ramps['brand']['500'],
    }
    (ROOT / 'design/palette.json').write_text(json.dumps(out, indent=2) + '\n')

    print(f'palette built and checked — {len(built)} themes, every pairing at or above its floor')
    for theme in ('light', 'dark'):
        t = built[theme]
        print(
            f"  {theme:5} body {contrast(t['textPrimary'], t['surfaceDim']):5.2f}:1"
            f"   secondary {contrast(t['textSecondary'], t['surfaceDim']):5.2f}:1"
            f"   accent {contrast(t['accent'], t['surface']):5.2f}:1"
            f"   alarm {contrast(t['alarm'], t['alarmWash']):5.2f}:1"
        )
    return 0


if __name__ == '__main__':
    sys.exit(main())
