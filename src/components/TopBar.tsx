'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, getStoredUser } from '@/lib/api';
import type { User } from '@/lib/types';

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  function logout() {
    clearSession();
    router.replace('/login');
  }

  const navItem = (href: string, label: string) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        className={`text-sm transition ${
          active ? 'text-rm-fog font-semibold' : 'text-rm-graphite hover:text-rm-fog'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-20 border-b border-rm-line bg-white/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/devices" className="flex items-baseline text-xl tracking-tight">
            <span className="font-extrabold text-rm-fog">RM</span>
            <span className="font-light text-rm-fog">soft</span>
            <span className="ml-2 text-[11px] font-bold tracking-[0.18em] text-rm-green -translate-y-[7px]">
              OS
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            {navItem('/devices', 'Devices')}
            {navItem('/clients', 'Clients')}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {user && (
            <span className="hidden sm:inline text-rm-graphite">
              {user.email}{' '}
              <span className="text-xs text-rm-graphite/60">({user.role})</span>
            </span>
          )}
          <button
            onClick={logout}
            className="text-rm-graphite hover:text-rm-fog transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
