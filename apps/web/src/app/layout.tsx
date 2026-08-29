import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Keys — check a number before you pay',
  description:
    'Check a Nigerian phone number against reports of rental scams. No account, no app.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Never `maximum-scale`. Half the people who will read a scam report on this
  // page are reading it on a cracked 5-inch screen in daylight.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0e11' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
