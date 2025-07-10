import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

const links = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/oracles', label: 'Oracles' },
  { href: '/tokens', label: 'Tokens' },
  { href: '/nfts', label: 'NFTs' },
  { href: '/dao', label: 'DAO' },
  { href: '/dao-oracle', label: 'DAO-Oracle' },
  { href: '/regional-stablecoins', label: 'Regional Stablecoins' },
  { href: '/vault', label: 'Vault' },
  { href: '/identity', label: 'Identity' },
];

export default function Menu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Close menu on route change
  // (Optional: If you want to auto-close on navigation)
  // useEffect(() => { setOpen(false); }, [router.pathname]);

  return (
    <nav className="bg-panAfrican-black border-b border-gray-800 mb-6 relative z-50">
      <div className="max-w-5xl mx-auto px-4 flex items-center h-14 justify-between">
        <div className="flex-1 flex gap-2 md:gap-4">
          {/* Logo or brand can go here if needed */}
        </div>
        <button
          className="md:hidden text-gray-200 focus:outline-none"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="main-menu"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        {/* Desktop menu */}
        <div className="hidden md:flex md:items-center md:gap-4">
          {links.map(link => (
            <Link key={link.href} href={link.href} legacyBehavior>
              <a
                className={`px-3 py-2 rounded text-sm font-medium transition-colors duration-150
                  ${router.pathname === link.href
                    ? 'bg-panAfrican-green text-black shadow'
                    : 'text-gray-200 hover:bg-gray-800 hover:text-white'}`}
              >
                {link.label}
              </a>
            </Link>
          ))}
        </div>
      </div>
      {/* Mobile menu and backdrop */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            id="main-menu"
            className="fixed top-14 left-0 w-full bg-panAfrican-black flex flex-col gap-2 py-6 px-6 z-50 md:hidden shadow-lg animate-fadeIn"
            role="menu"
            aria-label="Main menu"
          >
            {links.map(link => (
              <Link key={link.href} href={link.href} legacyBehavior>
                <a
                  className={`block w-full text-left px-4 py-3 rounded text-base font-medium transition-colors duration-150
                    ${router.pathname === link.href
                      ? 'bg-panAfrican-green text-black shadow'
                      : 'text-gray-200 hover:bg-gray-800 hover:text-white'}`}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  tabIndex={0}
                >
                  {link.label}
                </a>
              </Link>
            ))}
          </div>
        </>
      )}
    </nav>
  );
} 