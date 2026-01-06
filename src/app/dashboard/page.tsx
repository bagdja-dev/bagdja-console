'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile } from '@/lib/api';
import { Topbar } from '@/components/Topbar';
import { AppCard } from '@/components/AppCard';
import type { User, ApiError } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getProfile();
        setUser(userData);
      } catch (err) {
        const apiError = err as ApiError;
        if (apiError.statusCode === 401) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)]">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <Topbar userEmail={user?.email} />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Welcome{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            {user?.email && `Signed in as ${user.email}`}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AppCard
            title="Ecommerce Connect"
            description="Connect and manage your ecommerce store integrations"
            status="coming soon"
          />
          <AppCard
            title="Email Processing"
            description="Process and manage email communications"
            status="coming soon"
          />
        </div>
      </main>
    </div>
  );
}





