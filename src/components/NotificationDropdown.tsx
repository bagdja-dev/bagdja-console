'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { getNotifications, markNotificationAsRead, deleteNotification } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import type { Notification } from '@/types';
import { io, Socket } from 'socket.io-client';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

export function NotificationDropdown() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Setup WebSocket connection to Event Service
    const eventServiceUrl = process.env.NEXT_PUBLIC_EVENT_API || 'http://localhost:4085';
    const token = getAccessToken();

    if (token) {
      // Parse token to get userId
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.sub || payload.id;

        const socket = io(eventServiceUrl, {
          auth: { token },
          transports: ['websocket'],
        });

        socket.on('connect', () => {
          console.log('Connected to Event Hub WebSocket');
        });

        // Listen for standard hub events
        socket.on('event', (event) => {
          console.log('Received hub event:', event);

          const eventName = event.data?.eventName;
          const eventData = event.data?.data;

          // If the event is user.registered OR the payload contains our userId, refresh
          if (
            eventName === 'user.registered' ||
            eventData?.userId === userId ||
            eventData?.id === userId ||
            event.data?.filters?.userId === userId
          ) {
            console.log(`Relevant event '${eventName}' received, refreshing notifications`);
            fetchNotifications();
          }
        });

        // Also keep 'notification' as a general fallback for direct messages
        socket.on('notification', (data) => {
          console.log('Received direct notification:', data);
          fetchNotifications();
        });

        socketRef.current = socket;

        return () => {
          socket.disconnect();
        };
      } catch (e) {
        console.error('Failed to parse token for WebSocket:', e);
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      const wasUnread = notifications.find(n => n.id === id && !n.isRead);
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)]"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notifications</h3>
            <span className="text-xs text-[var(--text-secondary)]">{unreadCount} unread</span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-[var(--border-default)]">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`group relative flex flex-col p-4 hover:bg-[var(--bg-hover)] transition-colors ${!notification.isRead ? 'bg-[var(--bg-hover)]/30' : ''
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={`text-sm ${!notification.isRead ? 'font-bold' : 'font-medium'} text-[var(--text-primary)]`}>
                          {notification.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="mt-2 text-[10px] text-[var(--text-tertiary)]">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            className="p-1 text-[var(--action-primary)] hover:bg-[var(--bg-surface)] rounded"
                            title="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(notification.id, e)}
                          className="p-1 text-red-500 hover:bg-[var(--bg-surface)] rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Bell className="h-8 w-8 text-[var(--text-tertiary)] mb-2" />
                <p className="text-sm text-[var(--text-secondary)]">No notifications</p>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border-default)] p-2">
            <button
              className="w-full py-2 text-xs font-medium text-[var(--action-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
              onClick={() => {
                setIsOpen(false);
                router.push('/notifications');
              }}
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
