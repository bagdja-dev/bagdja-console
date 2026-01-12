'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getClientApps, getAppUsers } from '@/lib/api';
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/lib/products-api';
import { getPlans, createPlan, updatePlan, deletePlan } from '@/lib/plans-api';
import { getLicenses, getPurchasedLicenses, createLicense, updateLicense, deleteLicense } from '@/lib/licenses-api';
import { getAppSubscriptions } from '@/lib/subscriptions-api';
import type { ClientApp, ApiError, Product, Plan, PlanDuration, AppUser, CreateProductRequest, UpdateProductRequest, CreatePlanRequest, UpdatePlanRequest, License, CreateLicenseRequest, UpdateLicenseRequest, LicenseStatus, Subscription, SubscriptionStatus } from '@/types';
import { ArrowLeft, Package, Mail, Calendar, Users, ShoppingBag, CreditCard, Plus, Edit, Trash2, Key, Copy, Check, Coins } from 'lucide-react';
import ProductModal from '@/components/ProductModal';
import PlanModal from '@/components/PlanModal';
import LicenseModal from '@/components/LicenseModal';
import DistributePieceModal from '@/components/DistributePieceModal';

type TabType = 'users' | 'product' | 'plan' | 'license' | 'subscriptions';

export default function AppDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params?.id as string;

  const [app, setApp] = useState<ClientApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('users');
  
  // Users state
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [distributePieceModalOpen, setDistributePieceModalOpen] = useState(false);
  
  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Plans state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  
  // Licenses state
  const [licenses, setLicenses] = useState<License[]>([]);
  const [licensesLoading, setLicensesLoading] = useState(false);
  const [licensesError, setLicensesError] = useState<string | null>(null);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [licenseFilter, setLicenseFilter] = useState<'all' | 'available' | 'sold'>('all');
  const [purchasedLicenses, setPurchasedLicenses] = useState<License[]>([]);
  const [purchasedLicensesLoading, setPurchasedLicensesLoading] = useState(false);
  const [purchasedLicensesError, setPurchasedLicensesError] = useState<string | null>(null);
  
  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState<string | null>(null);
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'active' | 'expired' | 'cancelled'>('all');

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

  // Fetch users when users tab is active
  useEffect(() => {
    const fetchUsers = async () => {
      if (activeTab !== 'users' || !app?.id) return;

      try {
        setUsersLoading(true);
        setUsersError(null);
        const data = await getAppUsers(app.id);
        setAppUsers(data);
      } catch (err) {
        const apiError = err as ApiError;
        setUsersError(apiError.message || 'Failed to fetch users');
        console.error('Failed to fetch users:', err);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, [activeTab, app?.id]);

  // Fetch products when product tab is active
  useEffect(() => {
    const fetchProducts = async () => {
      if (activeTab !== 'product' || !app?.id) return;

      try {
        setProductsLoading(true);
        setProductsError(null);
        const data = await getProducts(app.id);
        setProducts(data);
      } catch (err) {
        const apiError = err as ApiError;
        setProductsError(apiError.message || 'Failed to fetch products');
        console.error('Failed to fetch products:', err);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [activeTab, app?.id]);

  // Fetch plans when plan tab is active
  useEffect(() => {
    const fetchPlans = async () => {
      if (activeTab !== 'plan' || !app?.id) return;

      try {
        setPlansLoading(true);
        setPlansError(null);
        const data = await getPlans(app.id);
        setPlans(data);
      } catch (err) {
        const apiError = err as ApiError;
        setPlansError(apiError.message || 'Failed to fetch plans');
        console.error('Failed to fetch plans:', err);
      } finally {
        setPlansLoading(false);
      }
    };

    fetchPlans();
  }, [activeTab, app?.id]);

  // Fetch licenses when license tab is active
  useEffect(() => {
    const fetchLicenses = async () => {
      if (activeTab !== 'license' || !app?.id) return;

      try {
        setLicensesLoading(true);
        setLicensesError(null);
        const data = await getLicenses(app.id);
        setLicenses(data);
      } catch (err) {
        const apiError = err as ApiError;
        setLicensesError(apiError.message || 'Failed to fetch licenses');
        console.error('Failed to fetch licenses:', err);
      } finally {
        setLicensesLoading(false);
      }
    };

    fetchLicenses();
  }, [activeTab, app?.id]);

  // Fetch purchased licenses when filter is 'sold'
  useEffect(() => {
    const fetchPurchasedLicenses = async () => {
      if (activeTab !== 'license' || licenseFilter !== 'sold' || !app?.id) return;

      try {
        setPurchasedLicensesLoading(true);
        setPurchasedLicensesError(null);
        const data = await getPurchasedLicenses(app.id);
        setPurchasedLicenses(data);
      } catch (err) {
        const apiError = err as ApiError;
        setPurchasedLicensesError(apiError.message || 'Failed to fetch purchased licenses');
        console.error('Failed to fetch purchased licenses:', err);
      } finally {
        setPurchasedLicensesLoading(false);
      }
    };

    fetchPurchasedLicenses();
  }, [activeTab, licenseFilter, app?.id]);

  // Fetch subscriptions when subscriptions tab is active
  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (activeTab !== 'subscriptions' || !app?.id) return;

      try {
        setSubscriptionsLoading(true);
        setSubscriptionsError(null);
        const data = await getAppSubscriptions(app.id);
        setSubscriptions(data);
      } catch (err) {
        const apiError = err as ApiError;
        setSubscriptionsError(apiError.message || 'Failed to fetch subscriptions');
        console.error('Failed to fetch subscriptions:', err);
      } finally {
        setSubscriptionsLoading(false);
      }
    };

    fetchSubscriptions();
  }, [activeTab, app?.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount) + ' piece';
  };

  const getProductTypeLabel = (type: string): string => {
    return type || 'Other';
  };

  const getDurationLabel = (duration: PlanDuration, durationValue: number | null): string => {
    if (!durationValue) return duration;
    const labels: Record<PlanDuration, string> = {
      daily: `${durationValue} day${durationValue > 1 ? 's' : ''}`,
      weekly: `${durationValue} week${durationValue > 1 ? 's' : ''}`,
      monthly: `${durationValue} month${durationValue > 1 ? 's' : ''}`,
      yearly: `${durationValue} year${durationValue > 1 ? 's' : ''}`,
    };
    return labels[duration] || duration;
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getLicenseStatusColor = (status: LicenseStatus) => {
    switch (status) {
      case 'available':
        return 'bg-blue-500/10 text-blue-600';
      case 'purchased':
        return 'bg-green-500/10 text-green-600';
      case 'revoked':
        return 'bg-red-500/10 text-red-600';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  };

  const getSubscriptionStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600';
      case 'expired':
        return 'bg-gray-500/10 text-gray-600';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  };

  const calculateDaysRemaining = (endDate: Date | string): number | null => {
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  };

  const handleCopyLicenseKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const refreshProducts = async () => {
    if (!app?.id) return;
    try {
      setProductsLoading(true);
      setProductsError(null);
      const data = await getProducts(app.id);
      setProducts(data);
    } catch (err) {
      const apiError = err as ApiError;
      setProductsError(apiError.message || 'Failed to fetch products');
      console.error('Failed to fetch products:', err);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleCreateProduct = async (data: CreateProductRequest) => {
    if (!app?.id) return;
    await createProduct(app.id, data);
    await refreshProducts();
  };

  const handleUpdateProduct = async (data: UpdateProductRequest) => {
    if (!editingProduct) return;
    await updateProduct(editingProduct.id, data);
    await refreshProducts();
    setEditingProduct(null);
  };

  const handleProductSubmit = async (data: CreateProductRequest | UpdateProductRequest) => {
    if (editingProduct) {
      await handleUpdateProduct(data as UpdateProductRequest);
    } else {
      await handleCreateProduct(data as CreateProductRequest);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteProduct(id);
      await refreshProducts();
    } catch (err) {
      const apiError = err as ApiError;
      alert(apiError.message || 'Failed to delete product');
      console.error('Failed to delete product:', err);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setProductModalOpen(true);
  };

  const closeProductModal = () => {
    setProductModalOpen(false);
    setEditingProduct(null);
  };

  const refreshPlans = async () => {
    if (!app?.id) return;
    try {
      setPlansLoading(true);
      setPlansError(null);
      const data = await getPlans(app.id);
      setPlans(data);
    } catch (err) {
      const apiError = err as ApiError;
      setPlansError(apiError.message || 'Failed to fetch plans');
      console.error('Failed to fetch plans:', err);
    } finally {
      setPlansLoading(false);
    }
  };

  const handleCreatePlan = async (data: CreatePlanRequest) => {
    if (!app?.id) return;
    await createPlan(app.id, data);
    await refreshPlans();
  };

  const handleUpdatePlan = async (data: UpdatePlanRequest) => {
    if (!editingPlan) return;
    await updatePlan(editingPlan.id, data);
    await refreshPlans();
    setEditingPlan(null);
  };

  const handlePlanSubmit = async (data: CreatePlanRequest | UpdatePlanRequest) => {
    if (editingPlan) {
      await handleUpdatePlan(data as UpdatePlanRequest);
    } else {
      await handleCreatePlan(data as CreatePlanRequest);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      return;
    }

    try {
      await deletePlan(id);
      await refreshPlans();
    } catch (err) {
      const apiError = err as ApiError;
      alert(apiError.message || 'Failed to delete plan');
      console.error('Failed to delete plan:', err);
    }
  };

  const openCreatePlanModal = () => {
    setEditingPlan(null);
    setPlanModalOpen(true);
  };

  const openEditPlanModal = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanModalOpen(true);
  };

  const closePlanModal = () => {
    setPlanModalOpen(false);
    setEditingPlan(null);
  };

  const refreshLicenses = async () => {
    if (!app?.id) return;
    try {
      setLicensesLoading(true);
      setLicensesError(null);
      const data = await getLicenses(app.id);
      setLicenses(data);
      
      // Also refresh purchased licenses if filter is 'sold'
      if (licenseFilter === 'sold') {
        try {
          setPurchasedLicensesLoading(true);
          setPurchasedLicensesError(null);
          const purchasedData = await getPurchasedLicenses(app.id);
          setPurchasedLicenses(purchasedData);
        } catch (err) {
          const apiError = err as ApiError;
          setPurchasedLicensesError(apiError.message || 'Failed to fetch purchased licenses');
          console.error('Failed to fetch purchased licenses:', err);
        } finally {
          setPurchasedLicensesLoading(false);
        }
      }
    } catch (err) {
      const apiError = err as ApiError;
      setLicensesError(apiError.message || 'Failed to fetch licenses');
      console.error('Failed to fetch licenses:', err);
    } finally {
      setLicensesLoading(false);
    }
  };

  const handleCreateLicense = async (data: CreateLicenseRequest) => {
    if (!app?.id) return;
    await createLicense(app.id, data);
    await refreshLicenses();
  };

  const handleUpdateLicense = async (data: UpdateLicenseRequest) => {
    if (!editingLicense) return;
    await updateLicense(editingLicense.id, data);
    await refreshLicenses();
    setEditingLicense(null);
  };

  const handleLicenseSubmit = async (data: CreateLicenseRequest | UpdateLicenseRequest) => {
    if (editingLicense) {
      await handleUpdateLicense(data as UpdateLicenseRequest);
    } else {
      await handleCreateLicense(data as CreateLicenseRequest);
    }
  };

  const handleDeleteLicense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this license? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteLicense(id);
      await refreshLicenses();
    } catch (err) {
      const apiError = err as ApiError;
      alert(apiError.message || 'Failed to delete license');
      console.error('Failed to delete license:', err);
    }
  };

  const openCreateLicenseModal = () => {
    setEditingLicense(null);
    setLicenseModalOpen(true);
  };

  const openEditLicenseModal = (license: License) => {
    if (license.status !== 'available') {
      alert('Only available licenses can be edited');
      return;
    }
    setEditingLicense(license);
    setLicenseModalOpen(true);
  };

  const closeLicenseModal = () => {
    setLicenseModalOpen(false);
    setEditingLicense(null);
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
          <button
            onClick={() => setActiveTab('license')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'license'
                ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              License
            </div>
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'subscriptions'
                ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Subscriptions
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Registered Users</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Users who have transacted with this application
                </p>
              </div>
              <button
                onClick={() => setDistributePieceModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
              >
                <Coins className="h-4 w-4" />
                Distribute Piece
              </button>
            </div>
            
            {usersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-[var(--text-secondary)]">Loading users...</div>
              </div>
            ) : usersError ? (
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
                <p className="text-[var(--text-danger)]">{usersError}</p>
              </div>
            ) : appUsers.length === 0 ? (
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
                <p className="text-[var(--text-secondary)]">No users found. Users will appear here after they make transactions with this app.</p>
              </div>
            ) : (
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
                        Transactions
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {appUsers.map((user) => (
                      <tr
                        key={user.id}
                        onClick={() => router.push(`/applications/owned/${app.id}/users/${user.id}`)}
                        className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                          {user.name || user.username}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">{user.email}</td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {formatDate(user.joinedDate)}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {formatDate(user.lastActivity)}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {user.transactionCount}
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
            )}
          </div>
        )}

        {/* Product Tab */}
        {activeTab === 'product' && (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Digital Products</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Available digital products in this application
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                onClick={openCreateModal}
              >
                <Plus className="h-4 w-4" />
                Create Product
              </button>
            </div>
            
            {productsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-[var(--text-secondary)]">Loading products...</div>
              </div>
            ) : productsError ? (
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
                <p className="text-[var(--text-danger)]">{productsError}</p>
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
                <p className="text-[var(--text-secondary)]">No products found. Create your first product!</p>
              </div>
            ) : (
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
                        Metadata
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-[var(--text-primary)]">
                          {product.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {getProductTypeLabel(product.type)}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                          {formatCurrency(Number(product.price))}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {product.metadata ? (
                            <div className="space-y-1">
                              {product.metadata.questions && (
                                <div>Questions: {product.metadata.questions}</div>
                              )}
                              {product.metadata.duration && (
                                <div>Duration: {product.metadata.duration} min</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[var(--text-muted)]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              product.status === 'active'
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-gray-500/10 text-gray-600'
                            }`}
                          >
                            {product.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--action-primary)] transition-colors"
                              onClick={() => openEditModal(product)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-danger)] transition-colors"
                              onClick={() => handleDeleteProduct(product.id)}
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
          </div>
        )}

        {/* Plan Tab */}
        {activeTab === 'plan' && (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Subscription Plans</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Available subscription plans for this application
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                onClick={openCreatePlanModal}
              >
                <Plus className="h-4 w-4" />
                Create Plan
              </button>
            </div>
            
            {plansLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-[var(--text-secondary)]">Loading plans...</div>
              </div>
            ) : plansError ? (
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
                <p className="text-[var(--text-danger)]">{plansError}</p>
              </div>
            ) : plans.length === 0 ? (
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
                <p className="text-[var(--text-secondary)]">No plans found. Create your first plan!</p>
              </div>
            ) : (
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
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {plans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-[var(--text-primary)]">
                          {plan.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                          {formatCurrency(Number(plan.price))}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {getDurationLabel(plan.duration, plan.durationValue)}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {plan.features && plan.features.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1">
                              {plan.features.slice(0, 2).map((feature, idx) => (
                                <li key={idx}>{feature}</li>
                              ))}
                              {plan.features.length > 2 && (
                                <li className="text-[var(--text-muted)]">+{plan.features.length - 2} more</li>
                              )}
                            </ul>
                          ) : (
                            <span className="text-[var(--text-muted)]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              plan.status === 'active'
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-gray-500/10 text-gray-600'
                            }`}
                          >
                            {plan.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--action-primary)] transition-colors"
                              onClick={() => openEditPlanModal(plan)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-danger)] transition-colors"
                              onClick={() => handleDeletePlan(plan.id)}
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
          </div>
        )}

        {/* License Tab */}
        {activeTab === 'license' && (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Licenses</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Manage licenses for this application
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                onClick={openCreateLicenseModal}
              >
                <Plus className="h-4 w-4" />
                Create License
              </button>
            </div>

            {/* Segmented Control for Filter */}
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => setLicenseFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  licenseFilter === 'all'
                    ? 'bg-[var(--action-primary)] text-white'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setLicenseFilter('available')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  licenseFilter === 'available'
                    ? 'bg-[var(--action-primary)] text-white'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                Available
              </button>
              <button
                onClick={() => setLicenseFilter('sold')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  licenseFilter === 'sold'
                    ? 'bg-[var(--action-primary)] text-white'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                Sold
              </button>
            </div>

            {/* Determine which data to display based on filter */}
            {(() => {
              const isLoading = licenseFilter === 'sold' ? purchasedLicensesLoading : licensesLoading;
              const error = licenseFilter === 'sold' ? purchasedLicensesError : licensesError;
              let displayData: License[] = [];

              if (licenseFilter === 'all') {
                displayData = licenses;
              } else if (licenseFilter === 'available') {
                displayData = licenses.filter((l) => l.status === 'available');
              } else if (licenseFilter === 'sold') {
                displayData = purchasedLicenses;
              }

              return (
                <>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-[var(--text-secondary)]">Loading licenses...</div>
                    </div>
                  ) : error ? (
                    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
                      <p className="text-[var(--text-danger)]">{error}</p>
                    </div>
                  ) : displayData.length === 0 ? (
                    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
                      <p className="text-[var(--text-secondary)]">
                        {licenseFilter === 'sold' 
                          ? 'No purchased licenses found.' 
                          : licenseFilter === 'available'
                          ? 'No available licenses found.'
                          : 'No licenses found. Create your first license!'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[var(--border-default)]">
                            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                              License Key
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                              Type
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                              Max Users
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                              Price
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                              Status
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                              Organization
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                              Expires
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]">
                          {displayData.map((license) => (
                      <tr key={license.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-[var(--text-primary)]">
                              {license.licenseKey}
                            </code>
                            <button
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--action-primary)] transition-colors"
                              onClick={() => handleCopyLicenseKey(license.licenseKey)}
                              title="Copy license key"
                            >
                              {copiedKey === license.licenseKey ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {license.type.toUpperCase()}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {license.maxUsers}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                          {formatCurrency(Number(license.price))}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getLicenseStatusColor(license.status)}`}>
                            {license.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {license.organizationName || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {formatDate(license.expiresAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {license.status === 'available' && (
                              <>
                                <button
                                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--action-primary)] transition-colors"
                                  onClick={() => openEditLicenseModal(license)}
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-danger)] transition-colors"
                                  onClick={() => handleDeleteLicense(license.id)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Subscriptions</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Manage subscriptions for this application
                </p>
              </div>
            </div>

            {/* Segmented Control for Filter */}
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => setSubscriptionFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  subscriptionFilter === 'all'
                    ? 'bg-[var(--action-primary)] text-white'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSubscriptionFilter('active')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  subscriptionFilter === 'active'
                    ? 'bg-[var(--action-primary)] text-white'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setSubscriptionFilter('expired')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  subscriptionFilter === 'expired'
                    ? 'bg-[var(--action-primary)] text-white'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                Expired
              </button>
              <button
                onClick={() => setSubscriptionFilter('cancelled')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  subscriptionFilter === 'cancelled'
                    ? 'bg-[var(--action-primary)] text-white'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                Cancelled
              </button>
            </div>

            {/* Determine which data to display based on filter */}
            {(() => {
              let displayData: Subscription[] = [];

              if (subscriptionFilter === 'all') {
                displayData = subscriptions;
              } else {
                displayData = subscriptions.filter((s) => s.status === subscriptionFilter);
              }

              return (
                <>
                  {subscriptionsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-[var(--text-secondary)]">Loading subscriptions...</div>
                    </div>
                  ) : subscriptionsError ? (
                    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
                      <p className="text-[var(--text-danger)]">{subscriptionsError}</p>
                    </div>
                  ) : displayData.length === 0 ? (
                    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
                      <p className="text-[var(--text-secondary)]">
                        {subscriptionFilter === 'all'
                          ? 'No subscriptions found.'
                          : `No ${subscriptionFilter} subscriptions found.`}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[var(--border-default)]">
                            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                              User ID
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                              Plan
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                              Start Date
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                              End Date
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                              Status
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                              Purchased
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]">
                          {displayData.map((subscription) => {
                            const daysRemaining = calculateDaysRemaining(subscription.endDate);
                            return (
                              <tr key={subscription.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                <td className="py-3 px-4">
                                  <code className="text-sm font-mono text-[var(--text-primary)]">
                                    {subscription.userId}
                                  </code>
                                </td>
                                <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                                  {subscription.planName || '-'}
                                </td>
                                <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                                  {formatDate(subscription.startDate)}
                                </td>
                                <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                                  <div className="flex items-center gap-2">
                                    <span>{formatDate(subscription.endDate)}</span>
                                    {subscription.status === 'active' && daysRemaining !== null && daysRemaining <= 7 && (
                                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-600">
                                        {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSubscriptionStatusColor(subscription.status)}`}>
                                    {subscription.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                                  {formatDate(subscription.createdAt)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Product Modal */}
      {app && (
        <ProductModal
          isOpen={productModalOpen}
          onClose={closeProductModal}
          onSubmit={handleProductSubmit}
          product={editingProduct}
          appId={app.id}
        />
      )}

      {/* Plan Modal */}
      {app && (
        <PlanModal
          isOpen={planModalOpen}
          onClose={closePlanModal}
          onSubmit={handlePlanSubmit}
          plan={editingPlan}
          appId={app.id}
        />
      )}

      {/* License Modal */}
      {app && (
        <LicenseModal
          isOpen={licenseModalOpen}
          onClose={closeLicenseModal}
          onSubmit={handleLicenseSubmit}
          license={editingLicense}
          appId={app.id}
        />
      )}

      {/* Distribute Piece Modal */}
      {app && (
        <DistributePieceModal
          isOpen={distributePieceModalOpen}
          onClose={() => setDistributePieceModalOpen(false)}
          users={appUsers}
          appId={app.id}
          onSuccess={() => {
            // Optionally refresh users or show success message
          }}
        />
      )}
    </div>
  );
}

