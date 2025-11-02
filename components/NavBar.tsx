'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavSearch } from './NavSearch';

const links = [
  { href: '/', label: 'Home' as const },
  { href: '/cache', label: 'Cache' as const }
] as const;

export function NavBar() {
  const pathname = usePathname() ?? '/';

  return (
    <nav className="site-nav" aria-label="Primary navigation">
      <Link href="/" className="site-nav__logo">
        Infinite Site
      </Link>
      <ul className="site-nav__links">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={[
                'site-nav__link',
                pathname === link.href ? 'site-nav__link--active' : null
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <NavSearch key={pathname} />
    </nav>
  );
}
