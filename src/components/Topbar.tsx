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
    <header className="w-full border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Bagdja Console
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {userEmail && (
              <span className="text-sm text-gray-600">{userEmail}</span>
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





