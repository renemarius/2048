import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: '2048 Hangul Conjugation',
  description: 'A 2048-style game for practicing Korean verb conjugation.',
};

// next/font/google can't serve Noto Sans KR: Next's bundled Google Fonts
// metadata has no CJK subsets for any font (Korean/Japanese/Chinese script
// fonts aren't split into small subset files the way Latin scripts are),
// so self-hosted optimization isn't available here. Loading it as a plain
// stylesheet link is the standard workaround — see specs/ui-v1.md.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
