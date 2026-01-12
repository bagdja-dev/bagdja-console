'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getClientApps } from '@/lib/api';
import type { ClientApp, ApiError } from '@/types';
import { ArrowLeft, Package, Mail, Calendar, Users, ShoppingBag, CreditCard } from 'lucide-react';

// Dummy data for Users tab
const dummyUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    joinedDate: '2024-01-15',
    status: 'Active',
    lastActivity: '2024-03-20',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    joinedDate: '2024-02-01',
    status: 'Active',
    lastActivity: '2024-03-19',
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    joinedDate: '2024-02-20',
    status: 'Inactive',
    lastActivity: '2024-03-10',
  },
  {
    id: '4',
    name: 'Alice Williams',
    email: 'alice.williams@example.com',
    joinedDate: '2024-03-01',
    status: 'Active',
    lastActivity: '2024-03-20',
  },
  {
    id: '5',
    name: 'Charlie Brown',
    email: 'charlie.brown@example.com',
    joinedDate: '2024-03-05',
    status: 'Active',
    lastActivity: '2024-03-18',
  },
];

// Dummy data for Product tab (Exam App Example)
const dummyProducts = [
  {
    id: '1',
    name: 'Mathematics Practice Test',
    type: 'Practice Test',
    price: 15000,
    status: 'Active',
    questions: 50,
    duration: 120, // minutes
    createdAt: '2024-01-10',
  },
  {
    id: '2',
    name: 'Physics Quiz Set 1',
    type: 'Quiz',
    price: 10000,
    status: 'Active',
    questions: 30,
    duration: 60,
    createdAt: '2024-01-15',
  },
  {
    id: '3',
    name: 'Chemistry Final Exam',
    type: 'Exam',
    price: 25000,
    status: 'Active',
    questions: 100,
    duration: 180,
    createdAt: '2024-02-01',
  },
  {
    id: '4',
    name: 'Biology Practice Questions',
    type: 'Practice Test',
    price: 12000,
    status: 'Draft',
    questions: 40,
    duration: 90,
    createdAt: '2024-02-15',
  },
  {
    id: '5',
    name: 'English Comprehension Test',
    type: 'Test',
    price: 8000,
    status: 'Active',
    questions: 25,
    duration: 45,
    createdAt: '2024-03-01',
  },
];

// Dummy data for Plan tab
const dummyPlans = [
  {
    id: '1',
    name: 'Basic Plan',
    price: 50000,
    duration: 30, // days
    features: ['10 Practice Tests', '5 Quizzes', 'Basic Support'],
    status: 'Active',
    subscribers: 150,
  },
  {
    id: '2',
    name: 'Premium Plan',
    price: 150000,
    duration: 30,
    features: ['Unlimited Tests', 'Unlimited Quizzes', 'Priority Support', 'Advanced Analytics'],
    status: 'Active',
    subscribers: 75,
  },
  {
    id: '3',
    name: 'Student Plan',
    price: 30000,
    duration: 30,
    features: ['5 Practice Tests', '3 Quizzes', 'Email Support'],
    status: 'Active',
    subscribers: 300,
  },
  {
    id: '4',
    name: 'Enterprise Plan',
    price: 500000,
    duration: 90,
    features: ['Unlimited Everything', 'Custom Integration', 'Dedicated Support', 'Custom Reports'],
    status: 'Active',
    subscribers: 12,
  },
];

type TabType = 'users' | 'product' | 'plan';

export default function AppDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params?.id as string;

  const [app, setApp] = useState<ClientApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('users');

  useEffect(() => {
    const fetchApp = async () => {
      try {
        setLoading(true);
        setError(null);

        const activeOrgId = typeof window !== 'undefined' ? sessionStorage.getItem('activeOrganizationId') : null;
        if (!activeOrgId) {
          setError('Please select an organization first');
          setLoading(false);
          return;
        }

        const apps = await getClientApps();
        const foundApp = apps.find((a) => a.id === appId);

        if (!foundApp) {
          setError('App not found');
          setLoading(false);
          return;
        }

        setApp(foundApp);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to fetch app');
        console.error('Failed to fetch app:', err);
      } finally {
        setLoading(false);
      }
    };

    if (appId) {
      fetchApp();
    }
  }, [appId]);

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="space-y-4">
        <Link
          href="/applications/owned"
          className="inline-flex items-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Apps
        </Link>
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
          <p className="text-[var(--text-danger)]">{error || 'App not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/applications/owned"
        className="inline-flex items-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Apps
      </Link>

      {/* Header Section */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
        <div className="flex items-start gap-6">
          {/* Logo */}
          <div className="flex-shrink-0">
            {app.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={app.logo}
                alt={app.appName}
                className="h-20 w-20 rounded-lg object-cover"
              />
            ) : (
              <div className="h-20 w-20 flex items-center justify-center rounded-lg bg-[var(--action-primary)]/10 text-[var(--action-primary)]">
                <Package className="h-10 w-10" />
              </div>
            )}
          </div>

          {/* App Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              {app.appName}
            </h1>
            {app.description && (
              <p className="text-[var(--text-secondary)] mb-4">{app.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-secondary)]">App ID:</span>
                <span className="font-mono text-[var(--text-primary)]">{app.appId}</span>
              </div>
              {app.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[var(--text-secondary)]" />
                  <span className="text-[var(--text-secondary)]">{app.contactEmail}</span>
                </div>
              )}
              {app.createdAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[var(--text-secondary)]" />
                  <span className="text-[var(--text-secondary)]">
                    Created {formatDate(app.createdAt)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    app.isActive
                      ? 'bg-green-500/10 text-green-600'
                      : 'bg-gray-500/10 text-gray-600'
                  }`}
                >
                  {app.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--border-default)]">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'users'
                ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </div>
          </button>
          <button
            onClick={() => setActiveTab('product')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'product'
                ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Product
            </div>
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'plan'
                ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Plan
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Registered Users</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Users who have registered and used this application
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Joined Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Last Activity
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {dummyUsers.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => router.push(`/applications/owned/${app.id}/users/${user.id}`)}
                      className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 text-sm text-[var(--text-primary)]">{user.name}</td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">{user.email}</td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                        {formatDate(user.joinedDate)}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                        {formatDate(user.lastActivity)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.status === 'Active'
                              ? 'bg-green-500/10 text-green-600'
                              : 'bg-gray-500/10 text-gray-600'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Product Tab */}
        {activeTab === 'product' && (
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Digital Products</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Available digital products in this application
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Product Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Price
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Questions
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Duration
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {dummyProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-[var(--text-primary)]">
                        {product.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">{product.type}</td>
                      <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                        {product.questions}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                        {product.duration} min
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            product.status === 'Active'
                              ? 'bg-green-500/10 text-green-600'
                              : 'bg-gray-500/10 text-gray-600'
                          }`}
                        >
                          {product.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Plan Tab */}
        {activeTab === 'plan' && (
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Subscription Plans</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Available subscription plans for this application
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Plan Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Price
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Duration
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Features
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Subscribers
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {dummyPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-[var(--text-primary)]">
                        {plan.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                        {formatCurrency(plan.price)}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                        {plan.duration} days
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                        <ul className="list-disc list-inside space-y-1">
                          {plan.features.slice(0, 2).map((feature, idx) => (
                            <li key={idx}>{feature}</li>
                          ))}
                          {plan.features.length > 2 && (
                            <li className="text-[var(--text-muted)]">+{plan.features.length - 2} more</li>
                          )}
                        </ul>
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                        {plan.subscribers}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            plan.status === 'Active'
                              ? 'bg-green-500/10 text-green-600'
                              : 'bg-gray-500/10 text-gray-600'
                          }`}
                        >
                          {plan.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

