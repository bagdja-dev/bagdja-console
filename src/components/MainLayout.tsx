'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface MainLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  username?: string;
  profilePicture?: string;
}

export function MainLayout({ children, userEmail, username, profilePicture }: MainLayoutProps) {
  // Initialize state from localStorage using lazy initialization
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebarCollapsed');
      return savedState === 'true';
    }
    return false;
  });

  // Save collapsed state to localStorage
  const handleToggle = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-main)]" style={{ position: 'relative', isolation: 'isolate' }}>
      {/* Sidebar */}
      <div style={{ position: 'relative', zIndex: 100 }}>
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={handleToggle}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
        {/* Topbar */}
        <Topbar userEmail={userEmail} username={username} profilePicture={profilePicture} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[var(--bg-main)]">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

