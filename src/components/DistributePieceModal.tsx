'use client';

import { useState, useEffect, useMemo } from 'react';
import type { AppUser, ApiError, User } from '@/types';
import { Input } from '@/ui/input';
import { X, Search, Check, UserPlus, Plus } from 'lucide-react';
import { distributePiece } from '@/lib/pieces-api';
import { getBalance } from '@/lib/pieces-api';
import { getUserById, findUserByUsernameOrEmail } from '@/lib/api';

interface DistributePieceModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: AppUser[];
  appId: string;
  onSuccess?: () => void;
}

interface SelectedUser {
  id: string;
  name?: string;
  username?: string;
  email: string;
  isManual?: boolean; // true if manually added by username/email
}

export default function DistributePieceModal({
  isOpen,
  onClose,
  users,
  appId,
  onSuccess,
}: DistributePieceModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<Map<string, SelectedUser>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromPieceId, setFromPieceId] = useState<string | null>(null);
  const [addingManual, setAddingManual] = useState(false);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Get balance to get fromPieceId on mount
  useEffect(() => {
    if (isOpen) {
      const fetchBalance = async () => {
        try {
          const balance = await getBalance();
          // Get GLOBAL level piece directly
          if (balance.global) {
            setFromPieceId(balance.global.id);
          } else {
            setError('Global Piece not found. Cannot distribute.');
          }
        } catch (err) {
          console.error('Failed to fetch balance:', err);
          setError('Failed to fetch global Piece balance. Please try again.');
        }
      };
      fetchBalance();
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUsers(new Map());
      setSearchQuery('');
      setManualInput('');
      setAmount('');
      setDescription('');
      setError(null);
      setAddingManual(false);
      setFromPieceId(null);
    } else {
      // Reset error when modal opens
      setError(null);
    }
  }, [isOpen]);

  const toggleUser = (user: AppUser) => {
    const newSelected = new Map(selectedUsers);
    if (newSelected.has(user.id)) {
      newSelected.delete(user.id);
    } else {
      newSelected.set(user.id, {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        isManual: false,
      });
    }
    setSelectedUsers(newSelected);
  };

  const removeUser = (userId: string) => {
    const newSelected = new Map(selectedUsers);
    newSelected.delete(userId);
    setSelectedUsers(newSelected);
  };

  const addManualUser = async () => {
    if (!manualInput.trim()) {
      setError('Please enter username, email, or user ID');
      return;
    }

    setAddingManual(true);
    setError(null);

    try {
      // Try to find user by ID first, then by username/email
      let user: User | null = null;
      
      // Check if it's a UUID (user ID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(manualInput.trim())) {
        try {
          user = await getUserById(manualInput.trim());
        } catch {
          // User not found by ID, continue to search
        }
      }

      // If not found by ID, try to search by username/email via API
      if (!user) {
        try {
          user = await findUserByUsernameOrEmail(manualInput.trim());
        } catch {
          // User not found via API, try searching in registered users as fallback
          const foundUser = users.find(
            (u) =>
              u.username?.toLowerCase() === manualInput.trim().toLowerCase() ||
              u.email?.toLowerCase() === manualInput.trim().toLowerCase()
          );
          if (foundUser) {
            user = foundUser as User;
          }
        }
      }

      if (!user) {
        setError('User not found. Please enter a valid username, email, or user ID that exists in the system.');
        setAddingManual(false);
        return;
      }

      // User found, add to selection
      const newSelected = new Map(selectedUsers);
      newSelected.set(user.id, {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        isManual: true,
      });
      setSelectedUsers(newSelected);
      setManualInput('');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to find user');
    } finally {
      setAddingManual(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedUsers.size === 0) {
      setError('Please select or add at least one user');
      return;
    }

    const amountNum = parseInt(amount, 10);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid positive integer amount');
      return;
    }

    if (amountNum % 1 !== 0) {
      setError('Amount must be an integer (no decimals)');
      return;
    }

    if (!fromPieceId) {
      setError('Failed to get source Piece. Please try again.');
      return;
    }


    setLoading(true);

    try {
      const distributePromises = Array.from(selectedUsers.values()).map((user, index) => {
        const referenceId = `distribute-${appId}-${user.id}-${Date.now()}-${index}`;
        return distributePiece({
          fromPieceId: fromPieceId as string,
          toUserId: user.id,
          toOwnerType: 'APP',
          toOwnerId: appId,
          amount: amountNum,
          referenceId,
          description: description || `Piece distribution to user`,
        });
      });

      await Promise.all(distributePromises);
      onSuccess?.();
      onClose();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to distribute Piece');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedUsersList = Array.from(selectedUsers.values());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] w-full max-w-2xl max-h-[90vh] overflow-hidden m-4 flex flex-col">
        <div className="sticky top-0 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[var(--action-primary)]" />
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Distribute Piece to Users
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Selected Users Summary */}
            {selectedUsersList.length > 0 && (
              <div className="p-3 bg-[var(--bg-sidebar)] rounded-lg">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                  Selected Users ({selectedUsersList.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedUsersList.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-1 px-2 py-1 bg-[var(--bg-surface)] rounded text-sm text-[var(--text-primary)]"
                    >
                      <span>{user.name || user.username || user.email}</span>
                      <button
                        type="button"
                        onClick={() => removeUser(user.id)}
                        className="hover:text-[var(--text-danger)] transition-colors"
                        disabled={loading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual User Input */}
            <div className="border-t border-[var(--border-default)] pt-4">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Add User Manually (Username, Email, or User ID)
              </label>
              <div className="flex gap-2">
                <Input
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addManualUser();
                    }
                  }}
                  disabled={loading || addingManual}
                  placeholder="Enter username, email, or user ID"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={addManualUser}
                  disabled={loading || addingManual || !manualInput.trim()}
                  className="px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                You can add any user from the system by entering their username, email, or user ID. This allows you to distribute Piece as a bonus to users who haven&apos;t transacted with this app yet.
              </p>
            </div>

            {/* Search Registered Users */}
            {users.length > 0 && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search registered users by name, username, or email..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent placeholder:text-[var(--text-muted)]"
                    disabled={loading}
                  />
                </div>
              </>
            )}

            {/* Registered Users List */}
            {users.length > 0 && (
              <div className="border border-[var(--border-default)] rounded-lg max-h-64 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-sm text-[var(--text-secondary)]">
                    No registered users found
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-default)]">
                    {filteredUsers.map((user) => {
                      const isSelected = selectedUsers.has(user.id);
                      return (
                        <label
                          key={user.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors ${
                            isSelected ? 'bg-[var(--bg-sidebar)]' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleUser(user)}
                            disabled={loading}
                            className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--action-primary)] focus:ring-[var(--action-primary)]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {user.name || user.username || 'No name'}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] truncate">
                              {user.email}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-[var(--action-primary)] flex-shrink-0" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Amount Input */}
            <Input
              label="Amount (Piece)"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow integers
                if (value === '' || /^\d+$/.test(value)) {
                  setAmount(value);
                }
              }}
              required
              disabled={loading}
              placeholder="e.g., 100"
              helpText="Enter amount as integer (no decimals)"
            />

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={2}
                className="w-full px-4 py-2 border rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent placeholder:text-[var(--text-muted)]"
                placeholder="Optional description for this distribution"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-[var(--bg-surface)] border-t border-[var(--border-default)] px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedUsers.size === 0 || !amount}
              className="px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                'Distributing...'
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Distribute to {selectedUsers.size} User{selectedUsers.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

