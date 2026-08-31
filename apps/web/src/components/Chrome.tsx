'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Keyhole } from './Keyhole';

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
    Not on the reply page.

    The masthead's only offer is "Report a number", and the person reading
    `/reply` arrived from an SMS telling them they have been reported. Offering
    them a one-tap way to report somebody else, on that page, at that moment,
    is an invitation to retaliate — and a registry full of revenge reports is
    the failure this product spends its whole review process avoiding.

    They can still reach it from the home page. It is just not put in front of
    them here.
  */
  const offerReporting = path !== '/reply';

  return (
    <header className="masthead">
      <Link href="/" className="brand" aria-label="Keys — home">
        <span className="brand-mark">
          <Keyhole size={20} />
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
        it names has seven days to answer first.
      </p>
    </footer>
  );
}
