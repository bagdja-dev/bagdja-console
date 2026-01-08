'use client';

import { useEffect, useState, useRef } from 'react';
import { logout, getOrganizations } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';
import { Building } from 'lucide-react';
import type { Organization } from '@/types';

interface TopbarProps {
  userEmail?: string;
  username?: string;
  profilePicture?: string;
}

export function Topbar({ userEmail, username, profilePicture }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Function to update active organization from sessionStorage
  const updateActiveOrganization = (orgs: Organization[]) => {
    const activeOrgId = sessionStorage.getItem('activeOrganizationId');
    if (activeOrgId) {
      const activeOrg = orgs.find(org => org.id === activeOrgId);
      if (activeOrg) {
        setActiveOrganization(activeOrg);
        return;
      }
    }
    // If no active org found or no activeOrgId, set first one
    if (orgs.length > 0) {
      const firstOrg = orgs[0];
      sessionStorage.setItem('activeOrganizationId', firstOrg.id);
      setActiveOrganization(firstOrg);
    }
  };

  // Fetch organizations and set active
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const orgs = await getOrganizations();
        setOrganizations(orgs);
        updateActiveOrganization(orgs);
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  // Listen for organization change events
  useEffect(() => {
    const handleOrganizationChange = () => {
      // Refresh organizations and update active
      const refreshOrganizations = async () => {
        try {
          const orgs = await getOrganizations();
          setOrganizations(orgs);
          updateActiveOrganization(orgs);
        } catch (error) {
          console.error('Failed to refresh organizations:', error);
        }
      };
      refreshOrganizations();
    };

    // Listen for custom event when organization is selected from organizations page
    window.addEventListener('organizationChanged', handleOrganizationChange);

    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChange);
    };
  }, []);

  // Refresh active organization when route changes (e.g., when coming back from organizations page)
  useEffect(() => {
    if (!loading && organizations.length > 0) {
      updateActiveOrganization(organizations);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setIsOrgDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };

    if (isOrgDropdownOpen || isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOrgDropdownOpen, isUserDropdownOpen]);

  const handleSelectOrganization = async (org: Organization) => {
    // Update active organization
    sessionStorage.setItem('activeOrganizationId', org.id);
    setActiveOrganization(org);
    setIsOrgDropdownOpen(false);

    // Dispatch custom event to notify all components to refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('organizationChanged', { 
        detail: { organizationId: org.id } 
      }));
    }

    // Refresh organizations to get latest data
    try {
      const orgs = await getOrganizations();
      setOrganizations(orgs);
      const updatedOrg = orgs.find(o => o.id === org.id);
      if (updatedOrg) {
        setActiveOrganization(updatedOrg);
      }
    } catch (error) {
      console.error('Failed to refresh organizations:', error);
    }
  };

  const handleLogout = () => {
    setIsUserDropdownOpen(false);
    logout();
    router.push('/login');
  };

  const handleProfileClick = () => {
    setIsUserDropdownOpen(false);
    // TODO: Navigate to profile page when implemented
    // router.push('/profile');
  };

  const handleMyOrganizations = () => {
    setIsUserDropdownOpen(false);
    router.push('/organizations');
  };

  return (
    <header className="w-full border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
      <div className="flex h-16 items-center justify-end px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {/* Organization Dropdown */}
          {!loading && activeOrganization && (
            <div className="relative" ref={orgDropdownRef}>
              <button
                type="button"
                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:ring-offset-2"
              >
                <span className="max-w-[200px] truncate">{activeOrganization.name}</span>
                <svg
                  className={`h-4 w-4 transition-transform ${isOrgDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOrgDropdownOpen && organizations.length > 0 && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="py-1">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => handleSelectOrganization(org)}
                        className={`block w-full px-4 py-2 text-left text-sm ${
                          activeOrganization.id === org.id
                            ? 'bg-[var(--bg-hover)] text-[var(--action-primary)]'
                            : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{org.name}</span>
                          {activeOrganization.id === org.id && (
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile Dropdown */}
          {(username || userEmail) && (
            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:ring-offset-2"
              >
                {/* Avatar */}
                {profilePicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profilePicture}
                    alt={username || userEmail || 'User'}
                    className="h-8 w-8 rounded-full object-cover border border-[var(--border-default)]"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                      if (fallback) {
                        fallback.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                {/* Fallback Avatar with Initial */}
                <div
                  className="avatar-fallback h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium text-white bg-[var(--action-primary)] border border-[var(--border-default)]"
                  style={{ display: profilePicture ? 'none' : 'flex' }}
                >
                  {(username || userEmail || 'U').charAt(0).toUpperCase()}
                </div>
                {/* Dropdown Arrow */}
                <svg
                  className={`h-4 w-4 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* User Dropdown Menu */}
              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  {/* User Info Section */}
                  <div className="px-4 py-3 border-b border-[var(--border-default)]">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      {profilePicture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profilePicture}
                          alt={username || userEmail || 'User'}
                          className="h-10 w-10 rounded-full object-cover border border-[var(--border-default)]"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.parentElement?.querySelector('.avatar-fallback-large') as HTMLElement;
                            if (fallback) {
                              fallback.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      {/* Fallback Avatar */}
                      <div
                        className="avatar-fallback-large h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium text-white bg-[var(--action-primary)] border border-[var(--border-default)]"
                        style={{ display: profilePicture ? 'none' : 'flex' }}
                      >
                        {(username || userEmail || 'U').charAt(0).toUpperCase()}
                      </div>
                      {/* Username */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {username || userEmail}
                        </div>
                        {userEmail && username && (
                          <div className="text-xs text-[var(--text-secondary)] truncate">
                            {userEmail}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    {/* Profile */}
                    <button
                      type="button"
                      onClick={handleProfileClick}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus:outline-none"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Profile</span>
                    </button>

                    {/* Separator */}
                    <div className="border-t border-[var(--border-default)] my-1"></div>

                    {/* My Organizations */}
                    <button
                      type="button"
                      onClick={handleMyOrganizations}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus:outline-none"
                    >
                      <Building className="h-4 w-4" />
                      <span>My Organizations</span>
                    </button>

                    {/* Separator */}
                    <div className="border-t border-[var(--border-default)] my-1"></div>

                    {/* Sign out */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus:outline-none"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign out</span>
                    </button>
                  </div>
          </div>
            )}
          </div>
          )}
        </div>
      </div>
    </header>
  );
}





