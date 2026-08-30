import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

import { Footer, Masthead } from '../components/Chrome';
import './globals.css';

/*
  One face, self-hosted.

  `next/font` downloads it at build time and serves it from this origin, so a
  reader on a Nigerian mobile connection makes no request to Google and the page
  cannot be blocked by somebody else's CDN. `display: swap` means the words are
  readable before the face arrives, which matters more here than the first frame
  looking right.

  The app deliberately uses the platform face instead — see `DESIGN.md`: on the
  Transsion handsets it targets, the system face is the one that renders every
  glyph at every weight. The web has no such constraint and a set typeface is
  most of what makes a page look like somebody built it on purpose.
*/
const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Keys — check a number before you pay',
  description:
    'Check a Nigerian phone number against reports of rental scams. No account, no app.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Never `maximum-scale`. Half the people who will read a scam report on this
  // page are reading it on a cracked five-inch screen in daylight.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0e13' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <Masthead />
        {children}
        <Footer />
      </body>
    </html>
  );
}
