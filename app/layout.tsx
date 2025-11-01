import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NavBar } from '../components/NavBar';

export const metadata: Metadata = {
  title: 'Infinite Site',
  description:
    'Infinite Site generates clean, cached HTML pages for any validated topic slug.',
  robots: {
    index: false,
    follow: false
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <NavBar />
        <div className="layout-main">{children}</div>
      </body>
    </html>
  );
}
