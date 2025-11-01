'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavSearch } from './NavSearch';

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="Primary navigation">
      <Link href="/" className="site-nav__logo">
        Infinite Site
      </Link>
      <NavSearch key={pathname} />
    </nav>
  );
}
