#!/usr/bin/env python3
"""
Does the app actually build, and do all four languages reach the device?

Every other gate reads source. This one reads the artefact Metro produces —
the single JavaScript file that is shipped inside the `.apk` and the `.ipa` —
and asks two questions of it:

1. **Did it build at all?** Nothing else in this repository answers that. The
   app can typecheck, lint, pass its tests and be impossible to bundle, because
   `tsc` resolves modules by TypeScript's rules and Metro resolves them by its
   own, and in a monorepo those two disagree for a living.

2. **Are the four languages in it?** The domain's tests prove the tables are
   filled in and the untranslated gate proves screens do not hardcode English,
   but neither proves the words survive bundling. A minifier that dropped a
   table, or a resolver that picked up a stale build of `@keys/domain`, would
   leave both of them green.

Non-ASCII is escaped in the bundle in at least two ways, so the escapes are
decoded before the text is searched. Checking the raw file finds `Duba lamba`
and misses `Ṣàyẹ̀wò`, which looks exactly like a missing translation.
"""

import pathlib
import re
import subprocess
import sys
import tempfile
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
MOBILE = ROOT / 'apps/mobile'

# One phrase per language, taken from the tables rather than invented here, so
# this cannot drift into asserting words the product does not use.
EXPECT = {
    'en': 'check_a_number',
    'ha': 'check_a_number',
    'yo': 'check_a_number',
    'ig': 'check_a_number',
}


def words() -> dict:
    """Read the four values straight out of the domain source."""
    text = (ROOT / 'packages/domain/src/language.ts').read_text()
    found = {}
    for table, language in [('EN', 'en'), ('HA', 'ha'), ('YO', 'yo'), ('IG', 'ig')]:
        start = text.index(f'export const {table}: Readonly<Record<Phrase, string>> = {{')
        block = text[start : text.index('\n};', start)]
        match = re.search(rf'{EXPECT[language]}:\s*"([^"]*)"', block)
        if not match:
            print(f'✗ {table} has no {EXPECT[language]} — this gate cannot check what it cannot find')
            sys.exit(1)
        found[language] = match.group(1)
    return found


def decode(raw: str) -> str:
    r"""Undo the bundle's escaping. Both `\uXXXX` and `\xNN` appear."""
    step = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), raw)
    return re.sub(r'\\x([0-9a-fA-F]{2})', lambda m: chr(int(m.group(1), 16)), step)


def main() -> int:
    expected = words()
    if len({*expected.values()}) != len(expected):
        print('✗ two languages carry the same word for this phrase; the check would pass on a copy')
        return 1

    with tempfile.TemporaryDirectory() as work:
        out = pathlib.Path(work) / 'index.android.bundle'
        result = subprocess.run(
            [
                'pnpm', 'exec', 'react-native', 'bundle',
                '--platform', 'android',
                '--dev', 'false',
                '--entry-file', 'index.js',
                '--bundle-output', str(out),
                '--assets-dest', work,
            ],
            cwd=MOBILE,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0 or not out.exists():
            print('✗ the app does not bundle')
            print((result.stderr or result.stdout)[-2000:])
            return 1

        raw = out.read_text(errors='replace')
        text = decode(raw)

        # The gate's own liveness check. An empty or tiny bundle would satisfy
        # nothing below by containing nothing, and report clean.
        if len(raw) < 200_000:
            print(f'✗ the bundle is {len(raw)} bytes — that is not this app')
            return 1

        missing = []
        for language, word in expected.items():
            forms = {word, unicodedata.normalize('NFC', word), unicodedata.normalize('NFD', word)}
            if not any(f in text for f in forms):
                missing.append(f'{language}: {word}')

        if missing:
            print('✗ words that never reached the bundle:')
            for line in missing:
                print(f'    {line}')
            return 1

        print(
            f'the app bundles ({round(len(raw) / 1024)} KB) '
            f'and carries all {len(expected)} languages'
        )
    return 0


if __name__ == '__main__':
    sys.exit(main())
