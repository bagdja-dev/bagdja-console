'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '#fondasi', label: 'Fondasi' },
  { href: '#cara-kerja', label: 'Cara kerja' },
  { href: '#keamanan', label: 'Keamanan' },
  { href: '#faq', label: 'FAQ' },
];

const noopSubscribe = () => () => {};

function hasSession(): boolean {
  try {
    return Boolean(sessionStorage.getItem('bagdja_access_token'));
  } catch {
    return false;
  }
}

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Session token lives in sessionStorage; server render assumes logged out.
  const loggedIn = useSyncExternalStore(noopSubscribe, hasSession, () => false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const close = () => setOpen(false);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        scrolled || open
          ? 'border-[var(--border-default)] bg-[#020617]/85 backdrop-blur-xl'
          : 'border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Navigasi utama">
        <Link href="/" className="flex items-center gap-2.5" onClick={close}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-7 w-auto" width={54} height={28} />
          <span className="text-sm font-semibold tracking-wide text-white">
            Bagdja <span className="text-[var(--action-primary)]">Console</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-[var(--text-secondary)] transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {loggedIn ? (
            <Link href="/dashboard" className="landing-btn-primary">
              Buka Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-[var(--text-secondary)] transition-colors hover:text-white">
                Masuk
              </Link>
              <Link href="/register" className="landing-btn-primary">
                Buat akun
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-white md:hidden"
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div id="landing-mobile-menu" className="border-t border-[var(--border-default)] px-4 pb-6 pt-2 md:hidden">
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={close}
                  className="block py-3 text-base text-[var(--text-secondary)] hover:text-white"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-3">
            {loggedIn ? (
              <Link href="/dashboard" className="landing-btn-primary justify-center" onClick={close}>
                Buka Dashboard
              </Link>
            ) : (
              <>
                <Link href="/register" className="landing-btn-primary justify-center" onClick={close}>
                  Buat akun
                </Link>
                <Link href="/login" className="landing-btn-ghost justify-center" onClick={close}>
                  Masuk
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
