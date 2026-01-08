'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile, getOrganizations } from '@/lib/api';
import { MainLayout } from '@/components/MainLayout';
import type { User, ApiError } from '@/types';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user profile first
        const userData = await getProfile();
        setUser(userData);

        // Fetch organizations
        try {
          const organizations = await getOrganizations();

          if (organizations && organizations.length > 0) {
            // Check if there's already an active organization in sessionStorage
            const activeOrgId = sessionStorage.getItem('activeOrganizationId');
            
            // If no active org or active org is not in the list, set first organization as active
            if (!activeOrgId || !organizations.some(org => org.id === activeOrgId)) {
              const firstOrg = organizations[0];
              sessionStorage.setItem('activeOrganizationId', firstOrg.id);
            }
          } else {
            // User has no organizations, redirect to create organization page
            // Only redirect if not already on the create page to avoid loop
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/organizations/create')) {
              router.push('/organizations/create');
              return; // Don't set loading to false yet, let redirect happen
            }
          }
        } catch (orgError) {
          // If getOrganizations fails (e.g., user has no orgs), still show user info
          console.error('Failed to fetch organizations:', orgError);
          // Don't redirect on error, let user see the page
        }
      } catch (err) {
        const apiError = err as ApiError;
        if (apiError.statusCode === 401) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)]">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  return <MainLayout userEmail={user?.email} username={user?.username} profilePicture={user?.profilePicture}>{children}</MainLayout>;
}

