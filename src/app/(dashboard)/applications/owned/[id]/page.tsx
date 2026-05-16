'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getClientApps, getAppUsers } from '@/lib/api';
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/lib/products-api';
import { getPlans, createPlan, updatePlan, deletePlan } from '@/lib/plans-api';
import { getLicenses, getPurchasedLicenses, createLicense, updateLicense, deleteLicense } from '@/lib/licenses-api';
import { getAppSubscriptions } from '@/lib/subscriptions-api';
import { ChannelType, ProviderType } from '@/types';
import type { ClientApp, ApiError, Product, Plan, PlanDuration, AppUser, CreateProductRequest, UpdateProductRequest, CreatePlanRequest, UpdatePlanRequest, License, CreateLicenseRequest, UpdateLicenseRequest, LicenseStatus, Subscription, SubscriptionStatus } from '@/types';
import { ArrowLeft, Package, Mail, Calendar, Users, ShoppingBag, CreditCard, Plus, Edit, Trash2, Key, Copy, Check, Coins, Activity, Shield, CheckCircle, XCircle, Globe, Lock, Code, List, Clock, Search, History, Link2, X, ChevronUp, ChevronDown, SlidersHorizontal, Filter } from 'lucide-react';
import DataGrid from '@/components/DataGrid';
import ProductModal from '@/components/ProductModal';
import PlanModal from '@/components/PlanModal';
import LicenseModal from '@/components/LicenseModal';
import DistributePieceModal from '@/components/DistributePieceModal';
import EventRegisterModal from '@/components/EventRegisterModal';
import EventSubscribeModal from '@/components/EventSubscribeModal';
import MessageTemplateModal from '@/components/MessageTemplateModal';
import {
  getAppContracts,
  getInfraContracts,
  createEventContract,
  registerAppInHub,
  updateEventContract,
  deleteEventContract,
  getMyAppSubscriptions,
  subscribeToEvent,
  updateMySubscription,
  deleteMySubscription,
  getSubscriptionRequests,
  updateSubscriptionStatus,
  getEventLogs
} from '@/lib/api';
import {
  getChannelSettings,
  setupChannel,
  testConnection,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
} from '@/lib/messages-api';

type TabType = 'users' | 'product' | 'plan' | 'license' | 'subscriptions' | 'events' | 'messaging';
type EventSubTab = 'broadcast' | 'subscribe' | 'requests' | 'log';
type MessagingSubTab = 'setup' | 'templates' | 'logs';

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

  // Events state
  const [eventSubTab, setEventSubTab] = useState<EventSubTab>('broadcast');
  const [refreshContracts, setRefreshContracts] = useState(0);
  const [subscriptionRequests, setSubscriptionRequests] = useState<any[]>([]);
  const [subscriptionRequestsLoading, setSubscriptionRequestsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [logDetailModalOpen, setLogDetailModalOpen] = useState(false);
  const [eventRegisterModalOpen, setEventRegisterModalOpen] = useState(false);
  const [eventSubscribeModalOpen, setEventSubscribeModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [editingSubscription, setEditingSubscription] = useState<any>(null);

  // Messaging state
  const [activeChannel, setActiveChannel] = useState<ChannelType | null>(null);
  const [messagingSubTab, setMessagingSubTab] = useState<MessagingSubTab>('setup');
  const [channelSettings, setChannelSettings] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [messagingLoading, setMessagingLoading] = useState(false);

  // Messaging methods
  const refreshTemplates = async () => {
    if (!app?.appId || !activeChannel) return;
    try {
      setTemplatesLoading(true);
      const data = await getTemplates(app.appId, activeChannel);
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleTemplateSubmit = async (data: any) => {
    if (!app?.appId) return;

    const payload = {
      ...data,
      appId: app.appId,
    };

    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, payload);
    } else {
      await createTemplate(payload);
    }
    await refreshTemplates();
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    if (!app?.appId) return;
    try {
      await deleteTemplate(id, app.appId);
      await refreshTemplates();
    } catch (err) {
      alert('Failed to delete template');
    }
  };

  useEffect(() => {
    if (activeTab === 'messaging' && messagingSubTab === 'templates' && activeChannel) {
      refreshTemplates();
    }
  }, [activeTab, messagingSubTab, activeChannel]);

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



  // Fetch subscription requests when events/requests tab is active
  useEffect(() => {
    const fetchRequests = async () => {
      if (activeTab !== 'events' || eventSubTab !== 'requests' || !app?.appId) return;

      try {
        setSubscriptionRequestsLoading(true);
        const res = await getSubscriptionRequests(app.appId);
        setSubscriptionRequests(res.data || []);
      } catch (err) {
        console.error('Failed to fetch subscription requests:', err);
      } finally {
        setSubscriptionRequestsLoading(false);
      }
    };

    fetchRequests();
  }, [activeTab, eventSubTab, app?.appId]);

  const formatCurrency = (amount: number, currency: string = 'IDR') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (err) {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount) + ' ' + currency;
    }
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

  const handleEventRegister = async (data: { eventName: string; schema: any; isPublic: boolean; isActive?: boolean }) => {
    if (!app) return;

    try {
      if (editingEvent) {
        // Update existing contract
        await updateEventContract(editingEvent.id, data);
      } else {
        // 1. Ensure app is registered in hub registry first (idempotent)
        await registerAppInHub({
          orgId: app.organizationId,
          orgSlug: app.orgSlug || 'bagdja',
          appId: app.appId,
          appSlug: app.appSlug || app.appId.split('-')[0],
        });

        // 2. Create the event contract
        await createEventContract(app.appId, data);
      }

      // 3. Refresh list
      setRefreshContracts(prev => prev + 1);
      setEditingEvent(null);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to process event');
    }
  };

  const handleEventSubscribe = async (contractId: string, webhookUrl?: string) => {
    if (!app?.appId) return;
    try {
      if (editingSubscription) {
        await updateMySubscription(editingSubscription.id, webhookUrl);
      } else {
        await subscribeToEvent(contractId, webhookUrl, app.appId);
      }

      // Refresh list
      setRefreshContracts(prev => prev + 1);
      setEditingSubscription(null);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to subscribe');
    }
  };

  const openEditSubscription = (sub: any) => {
    setEditingSubscription({
      id: sub.id,
      contractId: sub.contractId,
      webhookUrl: sub.webhookUrl,
      eventName: sub.contract?.eventName
    });
    setEventSubscribeModalOpen(true);
  };

  const openEditEvent = (event: any) => {
    setEditingEvent(event);
    setEventRegisterModalOpen(true);
  };

  const handleUpdateSubscriptionStatus = async (subId: string, status: string) => {
    if (!app?.appId) return;
    try {
      await updateSubscriptionStatus(subId, status);
      // Refresh grid by triggering refreshContracts state
      setRefreshContracts(prev => prev + 1);

      // Also update the local state for current count/notifications if needed
      const res = await getSubscriptionRequests(app.appId);
      setSubscriptionRequests(res.data || []);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleUnsubscribe = async (subId: string) => {
    if (!confirm('Are you sure you want to unsubscribe from this event?')) return;
    try {
      await deleteMySubscription(subId);
      setRefreshContracts(prev => prev + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to unsubscribe');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event contract? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteEventContract(id);
      // Refresh list
      setRefreshContracts(prev => prev + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to delete event');
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
                  className={`px-2 py-1 rounded text-xs font-medium ${app.isActive
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
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'users'
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
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'product'
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
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'plan'
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
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'license'
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
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'subscriptions'
              ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Subscriptions
            </div>
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'events'
              ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Event
            </div>
          </button>
          <button
            onClick={() => setActiveTab('messaging')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'messaging'
              ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Messaging
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
                Distribute BP
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
                            className={`px-2 py-1 rounded text-xs font-medium ${user.status === 'Active'
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
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Products</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Available products in this application
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
                        Product ID
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
                        <td className="py-3 px-4 text-sm font-mono text-[var(--text-secondary)]">
                          <div className="flex items-center gap-1">
                            <span className="truncate max-w-[120px]" title={product.id}>
                              {product.id}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(product.id);
                                setCopiedKey(product.id);
                                setTimeout(() => setCopiedKey(null), 2000);
                              }}
                              className="p-1 hover:text-[var(--action-primary)] transition-colors"
                            >
                              {copiedKey === product.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {getProductTypeLabel(product.type)}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                          {product.prices && product.prices.length > 0 ? (
                            <div className="space-y-0.5">
                              {product.prices.map((p) => (
                                <div key={p.currency} className="whitespace-nowrap">
                                  {formatCurrency(p.price, p.currency)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            formatCurrency(Number(product.price), 'IDR')
                          )}
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
                            className={`px-2 py-1 rounded text-xs font-medium ${product.status === 'active'
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
                          {formatCurrency(Number(plan.price), 'IDR')}
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
                            className={`px-2 py-1 rounded text-xs font-medium ${plan.status === 'active'
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${licenseFilter === 'all'
                  ? 'bg-[var(--action-primary)] text-white'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setLicenseFilter('available')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${licenseFilter === 'available'
                  ? 'bg-[var(--action-primary)] text-white'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
              >
                Available
              </button>
              <button
                onClick={() => setLicenseFilter('sold')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${licenseFilter === 'sold'
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
                                {formatCurrency(Number(license.price), 'IDR')}
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subscriptionFilter === 'all'
                  ? 'bg-[var(--action-primary)] text-white'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setSubscriptionFilter('active')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subscriptionFilter === 'active'
                  ? 'bg-[var(--action-primary)] text-white'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
              >
                Active
              </button>
              <button
                onClick={() => setSubscriptionFilter('expired')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subscriptionFilter === 'expired'
                  ? 'bg-[var(--action-primary)] text-white'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
              >
                Expired
              </button>
              <button
                onClick={() => setSubscriptionFilter('cancelled')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subscriptionFilter === 'cancelled'
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

        {/* Event Tab */}
        {activeTab === 'events' && (
          <div className="p-6">
            <div className="mb-6 flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Event Management</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Manage broadcasting, subscriptions, and logs for this application
                </p>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-4 border-b border-[var(--border-default)]">
                <button
                  onClick={() => setEventSubTab('broadcast')}
                  className={`pb-2 px-1 border-b-2 text-sm font-medium transition-colors ${eventSubTab === 'broadcast'
                    ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Broadcast
                  </div>
                </button>
                <button
                  onClick={() => setEventSubTab('subscribe')}
                  className={`pb-2 px-1 border-b-2 text-sm font-medium transition-colors ${eventSubTab === 'subscribe'
                    ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Subscribe
                  </div>
                </button>
                <button
                  onClick={() => setEventSubTab('requests')}
                  className={`pb-2 px-1 border-b-2 text-sm font-medium transition-colors ${eventSubTab === 'requests'
                    ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <CheckCircle className="h-4 w-4" />
                    Subscriber Request
                    {subscriptionRequests.filter(r => r.status === 'PENDING').length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                        {subscriptionRequests.filter(r => r.status === 'PENDING').length}
                      </span>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setEventSubTab('log')}
                  className={`pb-2 px-1 border-b-2 text-sm font-medium transition-colors ${eventSubTab === 'log'
                    ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Log
                  </div>
                </button>
              </div>
            </div>

            {/* Sub-tab Content */}
            {eventSubTab === 'broadcast' && (
              <DataGrid
                title="Your Event Contracts"
                description="Manage events that this application broadcasts to the hub."
                fetchData={(params) => getInfraContracts({ ...params, filter: { ...params.filter, appId: app?.appId } })}
                refreshTrigger={refreshContracts}
                actions={[
                  {
                    label: '',
                    icon: <Plus className="h-4 w-4" />,
                    onClick: () => setEventRegisterModalOpen(true),
                    variant: 'secondary'
                  }
                ]}
                columns={[
                  {
                    key: 'eventName',
                    label: 'Event Name',
                    sortable: true,
                    render: (val) => (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)]">
                          <Code className="h-4 w-4 text-[var(--text-secondary)]" />
                        </div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{val}</span>
                      </div>
                    )
                  },
                  {
                    key: 'isPublic',
                    label: 'Privacy',
                    sortable: true,
                    render: (val) => val ? (
                      <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase rounded-full border border-blue-500/20">Public</span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-gray-500/10 text-gray-400 text-[10px] font-bold uppercase rounded-full border border-gray-500/20">Private</span>
                    )
                  },
                  {
                    key: 'isActive',
                    label: 'Status',
                    sortable: true,
                    render: (val) => val ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase">Active</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase">Inactive</span>
                    )
                  },
                  {
                    key: 'createdAt',
                    label: 'Created',
                    sortable: true,
                    render: (val) => (
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="text-xs">{new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    )
                  },
                  {
                    key: 'id',
                    label: 'Actions',
                    render: (_, row) => (
                      <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openEditEvent(row)}
                          className="text-[var(--action-primary)] hover:text-[var(--action-primary-hover)] inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors"
                          title="Edit Contract"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(row.id)}
                          className="text-red-500 hover:text-red-600 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors"
                          title="Delete Contract"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  }
                ]}
                filterFields={[
                  { key: 'eventName', label: 'Event Name', type: 'text', placeholder: 'e.g. payment.paid' },
                  {
                    key: 'isActive',
                    label: 'Status',
                    type: 'select',
                    options: [
                      { label: 'Active', value: 'true' },
                      { label: 'Inactive', value: 'false' }
                    ]
                  },
                  {
                    key: 'isPublic',
                    label: 'Privacy',
                    type: 'select',
                    options: [
                      { label: 'Public', value: 'true' },
                      { label: 'Private', value: 'false' }
                    ]
                  }
                ]}
                emptyState={{
                  title: "No event contracts yet",
                  description: "Manage events that this application broadcasts to the hub. Start by registering your first event contract.",
                  icon: <Activity className="h-8 w-8 text-[var(--text-secondary)] opacity-50" />
                }}
              />
            )}

            {eventSubTab === 'subscribe' && (
              <DataGrid
                title="Your Subscriptions"
                description="Events that this application is currently subscribed to."
                fetchData={(params) => getMyAppSubscriptions(app?.appId, params)}
                refreshTrigger={refreshContracts}
                actions={[
                  {
                    label: '',
                    icon: <Plus className="h-4 w-4" />,
                    onClick: () => setEventSubscribeModalOpen(true),
                    variant: 'secondary'
                  }
                ]}
                columns={[
                  {
                    key: 'eventName',
                    label: 'Event',
                    sortable: true,
                    render: (_, row) => (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <Globe className="h-4 w-4 text-blue-400" />
                        </div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{row.contract?.eventName}</span>
                      </div>
                    )
                  },
                  {
                    key: 'sourceService',
                    label: 'Source Service',
                    render: (_, row) => (
                      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-tight">{row.contract?.app?.appId}</span>
                    )
                  },
                  {
                    key: 'webhookUrl',
                    label: 'Webhook',
                    sortable: true,
                    render: (val) => val ? (
                      <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                        <Link2 className="h-3.5 w-3.5" />
                        <span className="text-xs truncate max-w-[150px]" title={val}>{val}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">WebSocket Only</span>
                    )
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    sortable: true,
                    render: (val) => (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${val === 'approved'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : val === 'pending'
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                        {val === 'approved' ? 'Active' : val}
                      </span>
                    )
                  },
                  {
                    key: 'id',
                    label: 'Actions',
                    render: (_, row) => (
                      <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openEditSubscription(row)}
                          className="text-[var(--action-primary)] hover:text-[var(--action-primary-hover)] text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleUnsubscribe(row.id)}
                          className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                          Unsubscribe
                        </button>
                      </div>
                    )
                  }
                ]}
                filterFields={[
                  { key: 'eventName', label: 'Event Name', type: 'text', placeholder: 'e.g. payment.paid' },
                  {
                    key: 'status',
                    label: 'Status',
                    type: 'select',
                    options: [
                      { label: 'Active', value: 'approved' },
                      { label: 'Pending', value: 'pending' },
                      { label: 'Rejected', value: 'rejected' }
                    ]
                  }
                ]}
              />
            )}

            {eventSubTab === 'requests' && (
              <DataGrid
                title="Subscription Requests"
                description="Applications requesting to subscribe to your events."
                fetchData={(params) => getSubscriptionRequests(app?.appId, params)}
                refreshTrigger={refreshContracts}
                columns={[
                  {
                    key: 'subscriberApp',
                    label: 'Subscriber App',
                    render: (_, row) => (
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[var(--text-primary)]">{row.app?.appId}</span>
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase font-medium">{row.app?.orgSlug}</span>
                      </div>
                    )
                  },
                  {
                    key: 'eventName',
                    label: 'Event Name',
                    render: (_, row) => (
                      <span className="text-sm font-medium text-[var(--text-primary)]">{row.contract?.eventName}</span>
                    )
                  },
                  {
                    key: 'webhookUrl',
                    label: 'Webhook URL',
                    render: (val) => (
                      <span className="text-xs text-[var(--text-secondary)] font-mono">{val || 'WebSocket Only'}</span>
                    )
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    sortable: true,
                    render: (val) => (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${val === 'approved'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : val === 'rejected'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                        {val}
                      </span>
                    )
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (_, row) => (
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {row.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateSubscriptionStatus(row.id, 'approved')}
                              className="px-3 py-1 bg-[var(--action-primary)] text-white text-[10px] font-bold rounded hover:opacity-90 transition-opacity uppercase"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateSubscriptionStatus(row.id, 'rejected')}
                              className="px-3 py-1 bg-red-500 text-white text-[10px] font-bold rounded hover:opacity-90 transition-opacity uppercase"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {row.status === 'approved' && (
                          <>
                            <button
                              onClick={() => handleUpdateSubscriptionStatus(row.id, 'pending')}
                              className="text-[var(--text-secondary)] hover:text-amber-500 text-[10px] font-bold uppercase tracking-wider transition-colors"
                              title="Suspend and set to pending"
                            >
                              Suspend
                            </button>
                            <span className="text-[var(--border-default)]">|</span>
                            <button
                              onClick={() => handleUpdateSubscriptionStatus(row.id, 'rejected')}
                              className="text-red-400 hover:text-red-500 text-[10px] font-bold uppercase tracking-wider transition-colors"
                              title="Reject and block access"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {row.status === 'rejected' && (
                          <button
                            onClick={() => handleUpdateSubscriptionStatus(row.id, 'pending')}
                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-wider transition-colors"
                          >
                            Reset to Pending
                          </button>
                        )}
                      </div>
                    )
                  }
                ]}
                filterFields={[
                  { key: 'eventName', label: 'Event Name', type: 'text', placeholder: 'e.g. payment.paid' },
                  { key: 'subscriberAppId', label: 'Subscriber App', type: 'text', placeholder: 'App ID slug' },
                  {
                    key: 'status',
                    label: 'Status',
                    type: 'select',
                    options: [
                      { label: 'Approved', value: 'approved' },
                      { label: 'Pending', value: 'pending' },
                      { label: 'Rejected', value: 'rejected' }
                    ]
                  }
                ]}
                emptyState={{
                  title: "No subscription requests yet",
                  description: "Applications requesting to subscribe to your events.",
                  icon: <CheckCircle className="h-8 w-8 text-[var(--text-secondary)] opacity-50" />
                }}
              />
            )}

            {eventSubTab === 'log' && (
              <DataGrid
                title="Event Logs"
                description="Event history and logs for this application."
                fetchData={(params) => getEventLogs(app?.appId, params)}
                columns={[
                  {
                    key: 'type',
                    label: 'Type',
                    render: (val) => val === 'broadcast' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase border border-blue-500/20">
                        <Activity className="h-3 w-3" />
                        Broadcast
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase border border-purple-500/20">
                        <Link2 className="h-3 w-3" />
                        Delivery
                      </span>
                    )
                  },
                  { key: 'eventName', label: 'Event Name', sortable: true },
                  {
                    key: 'status',
                    label: 'Status',
                    sortable: true,
                    render: (val) => val === 'success' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase">Success</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase">{val}</span>
                    )
                  },
                  {
                    key: 'targetUrl',
                    label: 'Target/Response',
                    render: (val, row) => (
                      <div className="flex flex-col gap-1">
                        {val && (
                          <span className="text-[10px] text-[var(--text-secondary)] font-mono truncate max-w-[200px]" title={val}>
                            {val}
                          </span>
                        )}
                        {row.responseTimeMs && (
                          <span className="text-[10px] text-gray-500 italic">
                            Response: {row.responseTimeMs}ms
                          </span>
                        )}
                        {row.errorDetails && row.status === 'failed' && (
                          <span className="text-[10px] text-red-400/80 italic truncate max-w-[200px]" title={row.errorDetails}>
                            Error: {row.errorDetails}
                          </span>
                        )}
                      </div>
                    )
                  },
                  {
                    key: 'createdAt',
                    label: 'Time',
                    sortable: true,
                    render: (val) => (
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs">
                          {new Date(val).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZoneName: 'shortOffset'
                          })}
                        </span>
                      </div>
                    )
                  }
                ]}
                filterFields={[
                  { key: 'eventName', label: 'Event Name', type: 'text', placeholder: 'e.g. payment.paid' },
                  {
                    key: 'status',
                    label: 'Status',
                    type: 'select',
                    options: [
                      { label: 'Success', value: 'success' },
                      { label: 'Failed', value: 'failed' }
                    ]
                  },
                  {
                    key: 'type',
                    label: 'Log Type',
                    type: 'select',
                    options: [
                      { label: 'Broadcast', value: 'broadcast' },
                      { label: 'Delivery', value: 'delivery' }
                    ]
                  },
                  { key: 'appId', label: 'App Slug', type: 'text', placeholder: 'App ID slug' }
                ]}
                onRowClick={(row) => {
                  setSelectedLog(row);
                  setLogDetailModalOpen(true);
                }}
              />
            )}
          </div>
        )}

        {/* Messaging Tab */}
        {activeTab === 'messaging' && (
          <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {activeChannel ? `${activeChannel.charAt(0).toUpperCase() + activeChannel.slice(1)} Channel` : 'Messaging Service'}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {activeChannel
                    ? `Manage ${activeChannel} settings, templates, and delivery logs.`
                    : 'Select a communication channel to configure and manage.'}
                </p>
              </div>
              {activeChannel && (
                <button
                  onClick={() => setActiveChannel(null)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Channels
                </button>
              )}
            </div>

            {!activeChannel ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Email Channel Card */}
                <button
                  onClick={() => {
                    setActiveChannel(ChannelType.EMAIL);
                    setMessagingSubTab('setup');
                  }}
                  className="p-6 rounded-xl border border-[var(--border-default)] bg-white/5 hover:border-[var(--action-primary)] transition-all text-left group"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                      <Mail className="h-6 w-6 text-blue-400" />
                    </div>
                    <span className="font-bold text-[var(--text-primary)]">Email</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                    Send transactional emails using Bagdja default or your custom SMTP/Provider.
                  </p>
                  <div className="flex items-center text-xs font-bold text-[var(--action-primary)] uppercase tracking-widest">
                    Configure <ArrowLeft className="ml-2 h-3 w-3 rotate-180" />
                  </div>
                </button>

                {/* WhatsApp Channel Card (Coming Soon) */}
                <div className="p-6 rounded-xl border border-[var(--border-default)] bg-white/5 opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                      <Globe className="h-6 w-6 text-green-400" />
                    </div>
                    <span className="font-bold text-[var(--text-primary)]">WhatsApp</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                    Direct messaging via WhatsApp API. Coming soon as part of infrastructure update.
                  </p>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Coming Soon</span>
                </div>

                {/* SMS Channel Card (Coming Soon) */}
                <div className="p-6 rounded-xl border border-[var(--border-default)] bg-white/5 opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <Mail className="h-6 w-6 text-amber-400" />
                    </div>
                    <span className="font-bold text-[var(--text-primary)]">SMS</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                    Global SMS delivery for OTP and alerts. Coming soon.
                  </p>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Coming Soon</span>
                </div>
              </div>
            ) : (
              <>
                {/* Sub-tabs for the Active Channel */}
                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg w-fit mb-8">
                  <button
                    onClick={() => setMessagingSubTab('setup')}
                    className={`px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${messagingSubTab === 'setup'
                      ? 'bg-[var(--action-primary)] text-white shadow-lg'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                      }`}
                  >
                    Setup
                  </button>
                  <button
                    onClick={() => setMessagingSubTab('templates')}
                    className={`px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${messagingSubTab === 'templates'
                      ? 'bg-[var(--action-primary)] text-white shadow-lg'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                      }`}
                  >
                    Templates
                  </button>
                  <button
                    onClick={() => setMessagingSubTab('logs')}
                    className={`px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${messagingSubTab === 'logs'
                      ? 'bg-[var(--action-primary)] text-white shadow-lg'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                      }`}
                  >
                    Logs
                  </button>
                </div>

                {/* Channel Content */}
                <div className="space-y-6">
                  {messagingSubTab === 'setup' && (
                    <div className="max-w-2xl">
                      <div className="p-8 rounded-xl border border-[var(--border-default)] bg-white/5">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-[var(--action-primary)]/10 rounded-xl">
                              {activeChannel === ChannelType.EMAIL ? <Mail className="h-6 w-6 text-[var(--action-primary)]" /> : <Globe className="h-6 w-6 text-[var(--action-primary)]" />}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-[var(--text-primary)]">Provider Configuration</h3>
                              <p className="text-xs text-[var(--text-secondary)]">Choose how your {activeChannel}s are delivered.</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-green-500/10 text-green-400 text-[10px] font-black uppercase rounded-full border border-green-500/20">
                            System Default
                          </span>
                        </div>

                        <div className="space-y-6">
                          <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-start gap-4">
                            <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-[var(--text-primary)]">Using Bagdja Infrastructure</p>
                              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                Your application is currently using the shared Bagdja messaging service (noreply@bagdja.com).
                                No setup required.
                              </p>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-[var(--border-default)]">
                            <button
                              className="w-full py-3 px-4 rounded-xl bg-white/5 border border-[var(--border-default)] text-[var(--text-primary)] text-sm font-bold uppercase hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                            >
                              <Code className="h-4 w-4" />
                              Configure Custom {activeChannel === ChannelType.EMAIL ? 'SMTP' : 'Provider'}
                            </button>
                            <p className="text-[10px] text-[var(--text-secondary)] text-center mt-4">
                              Switch to your own provider for custom branding and higher limits.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {messagingSubTab === 'templates' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-md font-bold text-[var(--text-primary)] uppercase tracking-wider">{activeChannel} Templates</h3>
                        <button
                          onClick={() => {
                            setEditingTemplate(null);
                            setTemplateModalOpen(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-[var(--action-primary)] text-white text-xs font-bold rounded-lg hover:shadow-lg transition-all uppercase"
                        >
                          <Plus className="h-4 w-4" />
                          New Template
                        </button>
                      </div>

                      {templatesLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="text-[var(--text-secondary)]">Loading templates...</div>
                        </div>
                      ) : templates.length === 0 ? (
                        <div className="rounded-2xl border border-[var(--border-default)] bg-white/5 min-h-[300px] flex flex-col items-center justify-center p-12 text-center">
                          <div className="p-5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] mb-6 shadow-inner">
                            <Code className="h-10 w-10 text-[var(--text-secondary)] opacity-30" />
                          </div>
                          <h4 className="text-[var(--text-primary)] font-bold mb-2 text-lg">No {activeChannel} templates yet</h4>
                          <p className="text-[var(--text-secondary)] text-sm max-w-[350px] leading-relaxed">
                            Define your {activeChannel} templates using Handlebars syntax.
                            These can be triggered via the Message API.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-white/5">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-[var(--border-default)] bg-white/5">
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Template Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Subject</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Last Updated</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-default)]">
                              {templates.map((tpl) => (
                                <tr key={tpl.id} className="hover:bg-white/5 transition-colors group">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Code className="h-4 w-4" />
                                      </div>
                                      <span className="font-bold text-[var(--text-primary)]">{tpl.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-sm text-[var(--text-secondary)] italic truncate max-w-[300px] block">
                                      {tpl.subject || '-'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-xs text-[var(--text-secondary)] font-mono">
                                      {new Date(tpl.updatedAt).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => {
                                          setEditingTemplate(tpl);
                                          setTemplateModalOpen(true);
                                        }}
                                        className="p-2 text-[var(--text-secondary)] hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                        title="Edit Template"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTemplate(tpl.id)}
                                        className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        title="Delete Template"
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

                  {messagingSubTab === 'logs' && (
                    <div className="rounded-2xl border border-[var(--border-default)] bg-white/5 min-h-[400px] flex flex-col items-center justify-center p-12 text-center">
                      <div className="p-5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] mb-6 shadow-inner">
                        <History className="h-10 w-10 text-[var(--text-secondary)] opacity-30" />
                      </div>
                      <h4 className="text-[var(--text-primary)] font-bold mb-2 text-lg">No delivery history</h4>
                      <p className="text-[var(--text-secondary)] text-sm max-w-[350px] leading-relaxed">
                        Once your application starts sending {activeChannel}s, the detailed delivery logs and status will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
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

      {/* Distribute BP Modal */}
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

      {/* Event Register Modal */}
      {app && (
        <EventRegisterModal
          isOpen={eventRegisterModalOpen}
          onClose={() => {
            setEventRegisterModalOpen(false);
            setEditingEvent(null);
          }}
          onSubmit={handleEventRegister}
          appId={app.appId}
          initialData={editingEvent}
        />
      )}

      {/* Event Subscribe Modal */}
      {app && (
        <EventSubscribeModal
          isOpen={eventSubscribeModalOpen}
          onClose={() => {
            setEventSubscribeModalOpen(false);
            setEditingSubscription(null);
          }}
          onSubmit={handleEventSubscribe}
          initialData={editingSubscription}
        />
      )}

      {/* Message Template Modal */}
      {app && activeChannel && (
        <MessageTemplateModal
          isOpen={templateModalOpen}
          onClose={() => {
            setTemplateModalOpen(false);
            setEditingTemplate(null);
          }}
          onSubmit={handleTemplateSubmit}
          channelType={activeChannel}
          initialData={editingTemplate}
        />
      )}

      {/* Event Log Detail Modal */}
      {logDetailModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedLog.type === 'broadcast' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                  {selectedLog.type === 'broadcast' ? <Activity className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Log Detail</h3>
                  <p className="text-xs text-[var(--text-secondary)] uppercase font-mono tracking-wider">{selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setLogDetailModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-[var(--border-default)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Event Name</span>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{selectedLog.eventName}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-[var(--border-default)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Status</span>
                  <div>
                    {selectedLog.status === 'success' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase">Success</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase">{selectedLog.status}</span>
                    )}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-[var(--border-default)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Timestamp</span>
                  <p className="text-sm text-[var(--text-primary)]">
                    {new Date(selectedLog.createdAt).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      timeZoneName: 'shortOffset'
                    })}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-[var(--border-default)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Response Time</span>
                  <p className="text-sm text-[var(--text-primary)]">{selectedLog.responseTimeMs ? `${selectedLog.responseTimeMs}ms` : '-'}</p>
                </div>
              </div>

              {/* Target URL (for Deliveries) */}
              {selectedLog.targetUrl && (
                <div className="p-4 rounded-xl bg-white/5 border border-[var(--border-default)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Target Webhook URL</span>
                  <p className="text-xs font-mono text-[var(--text-primary)] break-all">{selectedLog.targetUrl}</p>
                </div>
              )}

              {/* Error Details */}
              {selectedLog.errorDetails && (
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-1">
                  <span className="text-[10px] font-bold text-red-400 uppercase">Error Details</span>
                  <p className="text-xs text-red-200/80 italic">{selectedLog.errorDetails}</p>
                </div>
              )}

              {/* Payload Viewer */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase px-1">Payload (JSON)</span>
                <div className="relative group">
                  <pre className="p-4 rounded-xl bg-black/40 border border-[var(--border-default)] text-xs font-mono text-blue-300 overflow-x-auto leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedLog.payload, null, 2));
                      alert('Payload copied to clipboard');
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-[var(--text-secondary)] transition-all opacity-0 group-hover:opacity-100"
                    title="Copy Payload"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[var(--border-default)] bg-white/5 flex justify-end">
              <button
                onClick={() => setLogDetailModalOpen(false)}
                className="px-6 py-2 bg-[var(--bg-surface)] hover:bg-white/5 border border-[var(--border-default)] text-[var(--text-primary)] rounded-xl text-sm font-bold uppercase tracking-wider transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
