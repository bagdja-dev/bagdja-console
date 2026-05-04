'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Check, Trash2, RefreshCw } from 'lucide-react';
import { deleteNotification, getNotifications, markNotificationAsRead } from '@/lib/api';
import type { Notification } from '@/types';

export default function NotificationsPage() {
  const limit = 20;
  const [items, setItems] = useState<Notification[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  const loadFirstPage = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getNotifications({ limit, offset: 0 });
      setItems(data);
      setOffset(data.length);
      setHasMore(data.length === limit);
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    try {
      setLoadingMore(true);
      setError(null);
      const data = await getNotifications({ limit, offset });
      setItems((prev) => [...prev, ...data]);
      setOffset((prev) => prev + data.length);
      setHasMore(data.length === limit);
    } catch (err: any) {
      setError(err?.message || 'Failed to load more notifications');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadFirstPage();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err: any) {
      setError(err?.message || 'Failed to mark notification as read');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete notification');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/10">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Notifications</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {unreadCount} unread
            </p>
          </div>
        </div>

        <button
          onClick={loadFirstPage}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-[var(--text-secondary)]">Loading notifications...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-default)] bg-white/5 min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
          <div className="p-4 bg-[var(--bg-surface)] rounded-full border border-[var(--border-default)] mb-4">
            <Bell className="h-8 w-8 text-[var(--text-secondary)] opacity-50" />
          </div>
          <h4 className="text-[var(--text-primary)] font-medium mb-1">No notifications</h4>
          <p className="text-[var(--text-secondary)] text-sm max-w-[360px]">
            Your notifications will appear here when events are delivered successfully.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border-default)]">
          <table className="min-w-full divide-y divide-[var(--border-default)]">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Title</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Message</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {items.map((n) => (
                <tr key={n.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{n.title}</span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{n.message}</p>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    {n.isRead ? (
                      <span className="px-2.5 py-0.5 bg-gray-500/10 text-gray-400 text-[10px] font-bold uppercase rounded-full border border-gray-500/20">Read</span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase rounded-full border border-blue-500/20">Unread</span>
                    )}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-xs text-[var(--text-secondary)]">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-3">
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          className="p-1 text-[var(--action-primary)] hover:bg-[var(--bg-surface)] rounded"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="p-1 text-red-500 hover:bg-[var(--bg-surface)] rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={loadMore}
            className="px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!hasMore || loadingMore}
          >
            {loadingMore ? 'Loading...' : hasMore ? 'Load More' : 'No More Notifications'}
          </button>
        </div>
      )}
    </div>
  );
}

