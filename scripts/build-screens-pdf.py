#!/usr/bin/env python3
"""
Binds `docs/screens/*.png` into `docs/Keys-screens.pdf`.

Run by hand, not by CI. It needs a booted simulator, a running API, a running
web server and Chrome — a gate that needs four of those is a gate people learn
to skip, and the captures themselves are taken by driving the app, which is not
something a build should be doing.

The captions are here rather than in the filenames because they say *why* each
screen looks the way it does, which is the only reason to bind them into a
document rather than hand somebody a folder.
"""

import base64
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / 'docs/screens'
OUT = ROOT / 'docs/Keys-screens.pdf'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

APP = [
    ('01-splash-arriving', 'Splash — the shield arrives',
     'The mark scales in against a mesh field: four coloured pools over the flat colour the '
     'native launch screen shares, so the hand-over is invisible.'),
    ('02-splash-turning', 'Splash — the key turns',
     'The key drops in and rotates a quarter turn. It is the only motion the mark can perform '
     'that means anything: the product does not move things, it opens one.'),
    ('03-splash-settled', 'Splash — settled',
     'Two rings open outward and are gone before the name arrives. Nothing is still moving when '
     'the app appears behind it.'),
    ('04-language-light', 'Language, light',
     'Each language named in its own script, and the product’s promise beneath it in that '
     'language. English is offered last, deliberately.'),
    ('05-language-dark', 'Language, dark',
     'Both themes are authored, not derived. Every colour on both comes from one generated palette.'),
    ('06-lookup-empty', 'Check a number',
     'The mark, the question, a lede saying what the number is checked against, and a note at the '
     'foot saying what Keys does not claim.'),
    ('07-lookup-not-a-number', 'Not a Nigerian number',
     '0803…, +234 803… and 803… are one number. A registry that treats them as three answers '
     '“nothing found” about a number it holds.'),
    ('08-lookup-nothing-upheld', 'Nothing upheld',
     'The page itself turns green. The verdict is legible at arm’s length before a word is read — '
     'and the card still states it in words, because colour alone is not a claim this product makes.'),
    ('09-lookup-upheld', 'One upheld report',
     'Red, and the count climbs to it rather than appearing. What it was reported for is named, in '
     'the reader’s own language — and the answer can be sent straight back into the chat it came '
     'from, where the link carries a preview card showing the verdict.'),
    ('10-lookup-unreachable', 'Could not reach Keys',
     'The one mistake this screen must never make is rendering a failed lookup as zero. Grey, never '
     'red: not knowing is not bad news.'),
]

WEB = [
    ('11-web-home', 'The web wedge',
     'No account, nothing to install. The result has a URL, so it can be sent to the person who asked.'),
    ('12-web-nothing-upheld', 'Nothing upheld',
     'The same caveat as the app: most scams are never reported, and a number used for the first '
     'time today has nothing against it either.'),
    ('13-web-upheld', 'One upheld report',
     'The page’s own light takes the verdict’s colour, set as one CSS custom property as the '
     'markup streams.'),
    ('14-web-report', 'Reporting a number',
     'What happens next is stated in full before the form asks for anything: a person reads it, the '
     'number gets seven days, it appears only if upheld.'),
    ('15-web-reply', 'Answering a report',
     '“Nothing has been published” sits above the accusation, not below it. The masthead does not '
     'offer to report anybody from this page.'),
    ('16-web-review', 'The review console',
     'Every action names a reviewer and states a reason. The queue depth is the constraint on how '
     'fast Keys can open a city.'),
    ('17-web-transparency', 'How often we are wrong',
     'The dismissal rate, the queue depth and the median time to a decision, published by the '
     'registry about itself. The endpoint behind it has no field that could name a reporter, a '
     'reviewer or a report — checked by the same test that checks no unreviewed report is '
     'reachable by any route.'),

    # Phases 4 to 6. The deck stopped at the registry, which was the whole
    # product in August and is now the second tab — a tenant arrives here to
    # *find a flat*, and checks a number when somebody has already found them.
    ('18-find-a-place', 'Find a place',
     'Checked places only, by default, and turning that off is a deliberate act. Each row carries '
     'what the place costs to move into rather than its advertised rent, because two flats '
     'advertising ₦800,000 are not the same price.'),
    ('19-listing-what-it-costs', 'What it costs to move in',
     'The advert says ₦800,000; the tenant pays ₦1,100,000. None of the difference is secret — '
     'agency fee, agreement fee, deposit, service charge — it is simply never added up anywhere '
     'before somebody is asked for it. A fee above the customary ten per cent is named as such, '
     'where the reader is already looking.'),
    ('20-listing-what-was-checked', 'What was checked',
     'Not a badge and not a score: the nine conditions, ticked or not, in the reader’s language, '
     'recomputed on this request from evidence. A screen reader now hears the state of each row — '
     'until the accessibility pass it heard only the names, which is the whole content of the '
     'page.'),
    ('21-messages-empty', 'Messages',
     'The empty state states the mechanism, because it is the reason to use this rather than the '
     'phone number in an advert: Keys holds both numbers back until each side offers theirs.'),
    ('22-ask-about-this-place', 'Asking, and the account that comes with it',
     'The account is part of the question rather than a gate in front of it. Somebody who has '
     'found a flat has a reason to give a name; somebody who has just opened the app has none. '
     'The number is hashed on arrival and no agent ever sees it — said here, where somebody '
     'wonders, rather than in a policy page.'),
    ('23-agent-account', 'The agent’s own account',
     'What a tenant sees when they check this number, then the properties. Everything an agent '
     'can *do* lives on a property’s own screen, which is also where the actions stop needing to '
     'ask which property they apply to.'),
    ('24-largest-text-size', 'At iOS’s largest accessibility size',
     'Checked rather than assumed, which is what the definition of done asks. At this setting the '
     'tab bar had been wrapping to three lines and taking forty per cent of the screen, listing '
     'titles truncated, and the cost breakdown collapsed to one word per line beside a figure — '
     'none of which overflowed or truncated in a way any automated check would have caught.'),
]


def data_uri(path: pathlib.Path) -> str:
    return 'data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode()


def mark_paths() -> tuple:
    src = (ROOT / 'apps/web/src/components/Mark.tsx').read_text()
    found = re.findall(r'd="([^"]+)"', src)
    return found[0], found[1]


def card(kind: str, name: str, title: str, note: str) -> str:
    path = SHOTS / f'{name}.png'
    if not path.exists():
        print(f'  ! missing {name}.png — skipped')
        return ''
    return (
        f'<section class="page {kind}">'
        f'<div class="shot"><img src="{data_uri(path)}" alt=""></div>'
        f'<div class="caption"><h2>{title}</h2><p>{note}</p></div>'
        f'</section>'
    )


def main() -> int:
    if not SHOTS.exists() or not any(SHOTS.glob('*.png')):
        print(f'✗ no captures in {SHOTS.relative_to(ROOT)} — take them first')
        return 1
    if not pathlib.Path(CHROME).exists():
        print('✗ Chrome is not installed; it is what turns the sheet into a PDF')
        return 1

    palette = json.loads((ROOT / 'design/palette.json').read_text())
    brand = palette['ramps']['brand']
    shield, key = mark_paths()

    html = f'''<!doctype html><meta charset="utf-8"><title>Keys — screens</title>
<style>
  @page {{ size: A4; margin: 14mm 14mm 12mm; }}
  * {{ box-sizing: border-box; }}
  body {{ margin:0; font: 10.5pt/1.5 -apple-system, "Helvetica Neue", sans-serif;
    color:#12131C; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
  .cover {{ height: 250mm; display:flex; flex-direction:column; justify-content:center;
    background: linear-gradient(150deg, {brand['200']} 0%, {brand['500']} 45%, {brand['900']} 100%);
    color:#fff; padding: 22mm; page-break-after: always; border-radius: 4mm; }}
  .cover h1 {{ font-size: 30pt; letter-spacing:-.03em; margin:.4em 0 .1em; font-weight:800; }}
  .cover p {{ font-size: 12pt; opacity:.92; max-width: 118mm; }}
  .cover .meta {{ margin-top:auto; font-size:9.5pt; opacity:.8 }}
  .mark {{ width:22mm; height:22mm; border-radius:6mm; background: rgba(255,255,255,.16);
    display:flex; align-items:center; justify-content:center; }}
  .page {{ page-break-inside: avoid; page-break-after: always; }}
  .page.app {{ display:grid; grid-template-columns: 62mm 1fr; gap: 10mm; align-items:start; }}
  .page.web .shot {{ margin-bottom: 6mm; }}
  /*
    Bounded by height, not width.

    A phone screenshot is about one to two, so `width:100%` on A4 made every
    image taller than the page it was on — `page-break-inside: avoid` cannot
    hold together an element that does not fit — and every screen came out as a
    fragment with its caption orphaned overleaf. Constraining the height leaves
    room for the caption underneath, which is the only reason to bind these
    into a document rather than hand somebody the folder.
  */
  .shot {{ text-align:center; }}
  .shot img {{ max-height: 216mm; max-width:100%; width:auto; display:inline-block;
    border-radius: 3mm; border:.3mm solid #E7E7EC; }}
  .page.app .shot img {{ border-radius: 5mm; }}
  h2 {{ font-size: 14pt; letter-spacing:-.02em; margin:0 0 2mm; }}
  .caption p {{ margin:0; color:#4A4F63; max-width: 150mm; }}
  .idx {{ page-break-after: always; }}
  .idx h1 {{ font-size:20pt; letter-spacing:-.02em; margin:0 0 6mm }}
  .idx ol {{ columns:2; column-gap:12mm; padding-left:5mm; font-size:10pt; color:#3A3F52 }}
  .idx li {{ margin-bottom:2.2mm; break-inside:avoid }}
</style>
<div class="cover">
  <div class="mark"><svg width="52" height="52" viewBox="0 0 48 48">
    <path fill-rule="evenodd" clip-rule="evenodd" fill="#fff" d="{shield}"/>
    <path fill="#fff" d="{key}"/></svg></div>
  <h1>Keys</h1>
  <p>Every screen in the product, on both surfaces, in the states that matter —
     including the ones that go wrong.</p>
  <p class="meta">Phase 1 of 8 · the scam registry · captured from the running app and site</p>
</div>
<section class="idx"><h1>What is in here</h1><ol>
{''.join(f'<li>{t}</li>' for _, t, _ in APP + WEB)}
</ol></section>
{''.join(card('app', *s) for s in APP)}
{''.join(card('web', *s) for s in WEB)}
'''

    sheet = ROOT / 'docs/screens/.sheet.html'
    sheet.write_text(html)
    subprocess.run(
        [CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
         f'--print-to-pdf={OUT}', '--virtual-time-budget=8000', f'file://{sheet}'],
        capture_output=True,
    )
    sheet.unlink(missing_ok=True)

    if not OUT.exists():
        print('✗ Chrome produced no PDF')
        return 1

    pages = len(re.findall(rb'/Type\s*/Page[^s]', OUT.read_bytes()))
    print(f'{OUT.relative_to(ROOT)} — {pages} pages, {round(OUT.stat().st_size / 1e6, 1)} MB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
