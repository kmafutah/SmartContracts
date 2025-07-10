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
  { href: '/Merchants', label: 'Merchants' },
];

export default function Menu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <nav className="bg-panAfrican-black border-b border-gray-800 mb-6">
      <div className="max-w-5xl mx-auto px-4 flex items-center h-14 justify-between">
        <div className="flex-1 flex gap-2 md:gap-4">
          <span className="text-xl font-bold text-panAfrican-green md:hidden">ZiG</span>
        </div>
        <button
          className="md:hidden flex items-center px-3 py-2 border rounded text-gray-200 border-gray-400 hover:text-white hover:border-white"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <svg className="fill-current h-6 w-6" viewBox="0 0 20 20"><path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" /></svg>
        </button>
        <div className="hidden md:flex flex-1 gap-2 md:gap-4">
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
      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-panAfrican-black border-t border-gray-800 px-4 pb-4 flex flex-col gap-2 z-50">
          {links.map(link => (
            <Link key={link.href} href={link.href} legacyBehavior>
              <a
                className={`block px-3 py-3 rounded text-base font-medium transition-colors duration-150
                  ${router.pathname === link.href
                    ? 'bg-panAfrican-green text-black shadow'
                    : 'text-gray-200 hover:bg-gray-800 hover:text-white'}`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
} 