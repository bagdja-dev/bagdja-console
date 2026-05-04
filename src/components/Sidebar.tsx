'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Mail,
  Plus,
  List,
  ChevronRight,
  Menu,
  X,
  Image as ImageIcon,
  Grid3x3,
  Package,
  CreditCard,
  Wallet,
  Settings,
  ShieldCheck,
  Server,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from './Tooltip';
import { getOrganizations } from '@/lib/api';
import type { Organization } from '@/types';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  children?: MenuItem[];
  isSystemOnly?: boolean;
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    id: 'email-service',
    label: 'Email Service',
    icon: Mail,
    children: [
      {
        id: 'email-create',
        label: 'Create New',
        icon: Plus,
        href: '/email-service/create',
      },
      {
        id: 'email-list',
        label: 'My Service',
        icon: List,
        href: '/email-service',
      },
    ],
  },
  {
    id: 'assets',
    label: 'Assets',
    icon: ImageIcon,
    children: [
      {
        id: 'assets-list',
        label: 'My Assets',
        icon: List,
        href: '/assets',
      },
      {
        id: 'assets-groups-list',
        label: 'Groups',
        icon: List,
        href: '/assets/groups',
      },
    ],
  },
  {
    id: 'applications',
    label: 'Applications',
    icon: Grid3x3,
    children: [
      {
        id: 'apps-owned',
        label: 'Owned Apps',
        icon: Package,
        href: '/applications/owned',
      },
      {
        id: 'apps-subscribed',
        label: 'Subscribed Apps',
        icon: List,
        href: '/applications/subscribed',
      },
    ],
  },
  {
    id: 'payment',
    label: 'Payment',
    icon: CreditCard,
    children: [
      {
        id: 'payment-wallet',
        label: 'Wallet',
        icon: Wallet,
        href: '/balance',
      },
      {
        id: 'payment-payout-setup',
        label: 'Payout Setup',
        icon: Settings,
        href: '/payment/payout-setup',
      },
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    icon: ShieldCheck,
    isSystemOnly: true,
    children: [
      {
        id: 'infra-settings',
        label: 'Infra Settings',
        icon: Settings,
        href: '/infrastructure/settings',
      },
    ],
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  // Track manually collapsed items (user has explicitly collapsed these)
  const manuallyCollapsedRef = useRef<Set<string>>(new Set());
  const previousPathnameRef = useRef<string>(pathname);

  // Check if user is system admin
  useEffect(() => {
    async function checkSystemAdmin() {
      try {
        const orgs = await getOrganizations();
        // User is system admin if they are an "Owner" in a System Organization
        const hasSystemOwnerRole = orgs.some(org => 
          org.isSystemOrg && (org.role?.slug === 'owner' || org.role?.name === 'Owner')
        );
        setIsSystemAdmin(hasSystemOwnerRole);
      } catch (error) {
        console.error('Failed to check system admin status:', error);
      }
    }
    checkSystemAdmin();
  }, []);

  // Filter menu items based on system admin status
  const visibleMenuItems = menuItems.filter(item => !item.isSystemOnly || isSystemAdmin);

  // Initialize expanded items based on active pathname (only once on mount)
  const getInitialExpanded = () => {
    const expanded: string[] = [];
    visibleMenuItems.forEach((item) => {
      if (item.children) {
        const hasActive = item.children.some(child => {
          const href = child.href;
          if (!href) return false;
          return pathname === href; // Exact match for child items
        });
        if (hasActive) {
          expanded.push(item.id);
        }
      }
    });
    return expanded;
  };

  const [expandedItems, setExpandedItems] = useState<string[]>(getInitialExpanded);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const popupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);

  // Auto-expand when pathname changes to ensure active child's parent is expanded
  // But respect manually collapsed items
  useEffect(() => {
    // Only auto-expand if pathname actually changed
    if (previousPathnameRef.current === pathname) {
      return;
    }
    previousPathnameRef.current = pathname;

    const shouldBeExpanded: string[] = [];
    visibleMenuItems.forEach((item) => {
      if (item.children) {
        const hasActive = item.children.some(child => {
          const href = child.href;
          if (!href) return false;
          return pathname === href; // Exact match for child items
        });
        if (hasActive) {
          // Only auto-expand if user hasn't manually collapsed it
          if (!manuallyCollapsedRef.current.has(item.id)) {
            shouldBeExpanded.push(item.id);
          }
        }
      }
    });

    // Update expanded items
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedItems(prev => {
      const merged = [...prev];
      shouldBeExpanded.forEach(id => {
        if (!merged.includes(id)) {
          merged.push(id);
        }
      });
      return merged;
    });
  }, [pathname, visibleMenuItems]);

  // Close popup when clicking outside (only when sidebar is collapsed)
  useEffect(() => {
    if (!isCollapsed) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside all popups and buttons
      let clickedOutside = true;

      // Check if click is on any button
      Object.values(buttonRefs.current).forEach((button) => {
        if (button && button.contains(event.target as Node)) {
          clickedOutside = false;
        }
      });

      // Check if click is on any popup
      Object.values(popupRefs.current).forEach((popup) => {
        if (popup && popup.contains(event.target as Node)) {
          clickedOutside = false;
        }
      });

      if (clickedOutside) {
        // Clear hover timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        // Close all popups (both hovered and expanded)
        setHoveredItemId(null);
        setPopupPosition(null);
        // Also collapse all expanded items (but keep track of manually collapsed)
        const currentExpanded = expandedItems;
        currentExpanded.forEach(id => {
          manuallyCollapsedRef.current.add(id);
        });
        setExpandedItems([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCollapsed, expandedItems]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const isCurrentlyExpanded = prev.includes(itemId);

      if (isCurrentlyExpanded) {
        // User is collapsing - remember this choice
        manuallyCollapsedRef.current.add(itemId);
        return prev.filter((id) => id !== itemId);
      } else {
        // User is expanding - remove from manually collapsed
        manuallyCollapsedRef.current.delete(itemId);
        return [...prev, itemId];
      }
    });
  };

  const handleNavigation = (href?: string) => {
    if (href) {
      router.push(href);
    }
  };

  const isActive = (href?: string, isChild = false) => {
    if (!href) return false;
    // Exact match first
    if (pathname === href) return true;

    // For child items, only exact match (no prefix matching to avoid conflicts)
    if (isChild) {
      return pathname === href;
    }

    // For parent items, check if pathname starts with href + '/' 
    // but only if the next segment exists (to avoid matching child routes)
    if (pathname.startsWith(href + '/')) {
      const hrefSegments = href.split('/').filter(Boolean);
      const pathSegments = pathname.split('/').filter(Boolean);
      // Only match if pathname has exactly one more segment than href
      // This means it's a direct child route
      return pathSegments.length === hrefSegments.length + 1;
    }

    return false;
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    // Only render if user is system admin or item is not system-only
    if (item.isSystemOnly && !isSystemAdmin) return null;

    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    // For parent items, only highlight if exact match or if a child is active (but don't highlight parent itself)
    const active = hasChildren ? false : isActive(item.href, level > 0);

    if (isCollapsed) {
      // Icon-only mode - hover shows popup, click toggles persistent expand
      if (hasChildren) {
        const isItemHovered = hoveredItemId === item.id;
        const shouldShowPopup = isExpanded || isItemHovered;

        const updatePopupPosition = (buttonElement: HTMLButtonElement | null) => {
          if (!buttonElement) return;

          const rect = buttonElement.getBoundingClientRect();
          // Align first child item top dengan button top
          // Popup structure: border (2px) + padding (8px) + first child item
          // We want first child item top to align with button top
          const popupBorder = 2; // border-2
          const popupPadding = 8; // p-2 = 8px
          const offsetToFirstChild = popupBorder + popupPadding;

          setPopupPosition({
            top: rect.top - offsetToFirstChild, // Adjust agar first child item top sejajar dengan button top
            left: rect.right + 8, // 0.5rem = 8px spacing from sidebar
          });
        };

        return (
          <div key={item.id}>
            <div
              className="relative"
              onMouseEnter={() => {
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current);
                  hoverTimeoutRef.current = null;
                }
                const button = buttonRefs.current[item.id];
                if (button) {
                  // Use requestAnimationFrame to avoid calling during render
                  requestAnimationFrame(() => {
                    updatePopupPosition(button);
                  });
                }
                setHoveredItemId(item.id);
              }}
              onMouseLeave={() => {
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current);
                }
                hoverTimeoutRef.current = setTimeout(() => {
                  if (!isExpanded) {
                    setHoveredItemId(null);
                    setPopupPosition(null);
                  }
                }, 200);
              }}
            >
              <button
                ref={(el) => {
                  buttonRefs.current[item.id] = el;
                  // Don't update position here to avoid infinite loop
                  // Position will be updated in event handlers
                }}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const button = buttonRefs.current[item.id];
                  if (button) {
                    requestAnimationFrame(() => {
                      updatePopupPosition(button);
                    });
                  }
                  toggleExpanded(item.id);
                }}
                className={cn(
                  'w-full flex items-center justify-center rounded-lg transition-colors cursor-pointer',
                  'hover:bg-[var(--bg-surface)]',
                  shouldShowPopup && 'bg-[var(--bg-surface)]',
                  active && 'text-[var(--action-primary)]'
                )}
                style={{ width: '44px', height: '44px', padding: 0 }}
              >
                <Icon className="w-5 h-5" />
              </button>
            </div>

            {shouldShowPopup && popupPosition && typeof window !== 'undefined' && createPortal(
              <div
                ref={(el) => {
                  popupRefs.current[item.id] = el;
                }}
                className="fixed bg-[var(--bg-surface)] border-2 border-[var(--border-default)] rounded-lg shadow-2xl p-2 space-y-1"
                style={{
                  zIndex: 999999,
                  pointerEvents: 'auto',
                  minWidth: '12rem',
                  width: '12rem',
                  top: `${popupPosition.top}px`, // getBoundingClientRect already gives viewport coordinates
                  left: `${popupPosition.left}px`,
                  position: 'fixed',
                  marginTop: 0,
                  transform: 'none',
                }}
                onMouseEnter={() => {
                  if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current);
                    hoverTimeoutRef.current = null;
                  }
                  setHoveredItemId(item.id);
                }}
                onMouseLeave={() => {
                  if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current);
                  }
                  if (!isExpanded) {
                    hoverTimeoutRef.current = setTimeout(() => {
                      setHoveredItemId(null);
                      setPopupPosition(null);
                    }, 200);
                  }
                }}
              >
                {item.children?.map((child) => {
                  const ChildIcon = child.icon;
                  const childActive = isActive(child.href, true);
                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNavigation(child.href);
                        if (!isExpanded) {
                          setHoveredItemId(null);
                          setPopupPosition(null);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer',
                        'hover:bg-[var(--bg-sidebar)]',
                        childActive && 'bg-[var(--bg-sidebar)] text-[var(--action-primary)]',
                        !childActive && 'text-[var(--text-secondary)]'
                      )}
                      title={child.label}
                    >
                      <ChildIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{child.label}</span>
                    </button>
                  );
                })}
              </div>,
              document.body
            )}
          </div>
        );
      }

      return (
        <Tooltip key={item.id} content={item.label} side="right">
          <button
            onClick={() => handleNavigation(item.href)}
            className={cn(
              'w-full flex items-center justify-center p-3 rounded-lg transition-colors',
              'hover:bg-[var(--bg-surface)]',
              active && 'bg-[var(--bg-surface)] text-[var(--action-primary)]'
            )}
          >
            <Icon className="w-5 h-5" />
          </button>
        </Tooltip>
      );
    }

    // Full sidebar mode
    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              handleNavigation(item.href);
            }
          }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
            'hover:bg-[var(--bg-surface)]',
            active && 'bg-[var(--bg-surface)] text-[var(--action-primary)]',
            !active && 'text-[var(--text-secondary)]',
            level > 0 && 'ml-4' // Indent submenu items
          )}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1 text-sm font-medium">{item.label}</span>
          {hasChildren && (
            <ChevronRight
              className={cn(
                'w-4 h-4 transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
          )}
        </button>
        {hasChildren && isExpanded && !isCollapsed && (
          <div className="ml-4 mt-1 space-y-1">
            {item.children?.map((child) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-default)] transition-all duration-300 flex flex-col',
        isCollapsed ? 'w-16' : 'w-64'
      )}
      style={{
        position: 'relative',
        overflow: isCollapsed ? 'visible' : 'hidden',
        zIndex: 100,
        isolation: 'isolate'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Bagdja Console
          </h2>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-[var(--bg-surface)] transition-colors"
        >
          {isCollapsed ? (
            <Menu className="w-5 h-5 text-[var(--text-secondary)]" />
          ) : (
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          )}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto overflow-x-visible p-3 space-y-1" style={{ position: 'relative', isolation: 'isolate' }}>
        {menuItems.map((item) => renderMenuItem(item))}
      </nav>
    </div>
  );
}
