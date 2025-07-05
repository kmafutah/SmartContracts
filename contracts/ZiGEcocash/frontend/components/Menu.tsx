import Link from 'next/link';
import { useRouter } from 'next/router';

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
  return (
    <nav className="bg-panAfrican-black border-b border-gray-800 mb-6">
      <div className="max-w-5xl mx-auto px-4 flex items-center h-14">
        <div className="flex-1 flex gap-2 md:gap-4">
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
    </nav>
  );
} 