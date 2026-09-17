#!/usr/bin/env python3
"""
Fail the build on any sentence that implies Keys holds, moves or asks for
money, or protects somebody (ADR-0009, CLAUDE.md rule 4). Reads every phrase
table in the domain — all four languages — and every string literal in the
app and web sources, because the overclaim is one word long and arrives in
the most helpful-looking sentence.

The list is words, not intent. A sentence *explaining* that Keys never holds
money is caught too; say it without the word.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = [
    ROOT / "packages/domain/src/language.ts",
    *sorted((ROOT / "apps/mobile/src").rglob("*.ts")),
    *sorted((ROOT / "apps/mobile/src").rglob("*.tsx")),
    *sorted((ROOT / "apps/web/src").rglob("*.ts")),
    *sorted((ROOT / "apps/web/src").rglob("*.html")),
]
BANNED = re.compile(
    r"\b(pay\s+now|pay\s+(?:through|via|with|on)\s+keys|pay\s+here|wallet|escrow|we\s+hold|keys\s+holds?|"
    r"secure\s+your\s+deposit|deposit\s+(?:is\s+)?(?:safe|protected|guaranteed)|guarantee[ds]?|"
    r"insured|protected\s+by\s+keys|payout|balance\s+due|outstanding\s+balance|"
    r"send\s+(?:the\s+)?money|transfer\s+(?:the\s+)?(?:rent|money|funds)|collect\s+(?:the\s+)?rent|"
    r"payment\s+(?:request|link|button)|request\s+(?:a\s+)?payment)\b",
    re.IGNORECASE,
)
RED, GRN, OFF = "\033[0;31m", "\033[0;32m", "\033[0m"


def literals(text: str):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"(^|\s)//.*", "", text)
    for lit in re.findall(r"'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\"|`((?:[^`\\]|\\.)*)`", text):
        s = lit[0] or lit[1] or lit[2]
        if len(s) >= 4 and " " in s:
            yield s


def main() -> int:
    hits, n = [], 0
    for f in FILES:
        if not f.exists():
            continue
        for s in literals(f.read_text()):
            n += 1
            for m in BANNED.finditer(s):
                hits.append((f, m.group(0), s))
    for f, word, s in hits:
        print(f"{RED}✗{OFF} {f.relative_to(ROOT)}: '{word}' in \"{s[:80]}\"")
    if hits:
        print(f"{RED}copy gate failed: {len(hits)} sentence(s) imply money held, moved or asked for{OFF}")
        return 1
    print(f"{GRN}✓{OFF} nothing the product says implies it holds, moves or asks for money — {n} strings checked")
    return 0


if __name__ == "__main__":
    sys.exit(main())
