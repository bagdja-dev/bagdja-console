'use client';

import React, { createContext, useContext, ReactNode, useCallback } from 'react';

interface LayoutContextType {
  setTopbarContent: (content: React.ReactNode | null) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  // Stable function that doesn't trigger re-renders of the provider
  const setTopbarContent = useCallback((content: React.ReactNode | null) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('updateTopbarContent', { detail: content }));
    }
  }, []);

  return (
    <LayoutContext.Provider value={{ setTopbarContent }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
