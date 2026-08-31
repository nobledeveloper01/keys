'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Mark } from './Mark';

/**
 * The masthead, on every page.
 *
 * The pages had no header at all: each one opened with its own `<h1>` floating
 * at the top of an empty column, so nothing said what the site was or that the
 * four pages were one product. Somebody arriving on `/reply` from an SMS had no
 * way to tell whose service had just accused them of something.
 */
export function Masthead() {
  const path = usePathname();

  /*
    Not on the pages somebody reaches from a text we sent them.

    The masthead's only offer is "Report a number". The person reading `/reply`
    arrived from an SMS telling them they have been reported; the person
    reading `/authority` arrived from one asking them to confirm or withdraw an
    agent. Both are already unhappy, both are looking at a claim about somebody
    they know, and offering either of them a one-tap way to report that person
    at that moment is an invitation to retaliate. A registry full of revenge
    reports is the failure this product spends its whole review process
    avoiding.

    Written as a list with the reason attached, rather than one `!==`, because
    the `/authority` page inherited this defect the day it was written — the
    fix was made for `/reply` alone and the next capability page walked
    straight into it. Every future page reached from a text belongs here, and
    the name says which those are.
  */
  const ARRIVED_FROM_A_TEXT_WE_SENT = ['/reply', '/authority'];
  const offerReporting = !ARRIVED_FROM_A_TEXT_WE_SENT.includes(path);

  return (
    <header className="masthead">
      <Link href="/" className="brand" aria-label="Keys — home">
        <span className="brand-mark">
          <Mark size={20} />
        </span>
        <span className="brand-word">Keys</span>
      </Link>
      {offerReporting ? (
        <nav className="masthead-nav">
          <Link href="/report">Report a number</Link>
        </nav>
      ) : null}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <p>
        Keys verifies <strong>authority to let</strong>, not title or ownership, and
        handles no money.
      </p>
      <p className="footer-quiet">
        Nothing in the registry is published until a person reviews it, and the number
        it names has seven days to answer first.{' '}
        <Link href="/transparency">See how often we are wrong</Link>.
      </p>
    </footer>
  );
}
