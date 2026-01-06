'use client';

import { logout } from '@/lib/api';
import { Button } from '@/ui/button';
import { useRouter } from 'next/navigation';

interface TopbarProps {
  userEmail?: string;
}

export function Topbar({ userEmail }: TopbarProps) {
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="w-full border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              Bagdja Console
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {userEmail && (
              <span className="text-sm text-[var(--text-secondary)]">{userEmail}</span>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}





