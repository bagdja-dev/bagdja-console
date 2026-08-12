'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getClientApps, getAppUsers, updateOAuthRedirectUris } from '@/lib/api';
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/lib/products-api';
import { getPlans, createPlan, updatePlan, deletePlan } from '@/lib/plans-api';
import { getLicenses, getPurchasedLicenses, createLicense, updateLicense, deleteLicense } from '@/lib/licenses-api';
import { ChannelType } from '@/types';
import type { ClientApp, ApiError, Product, Plan, PlanDuration, AppUser, CreateProductRequest, UpdateProductRequest, CreatePlanRequest, UpdatePlanRequest, License, CreateLicenseRequest, UpdateLicenseRequest, LicenseStatus } from '@/types';
import { getLogs } from '@/lib/logs-api';
import { 
  ArrowLeft, 
  Package, 
  Mail, 
  Calendar, 
  Users, 
  ShoppingBag, 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2, 
  Key, 
  Copy, 
  Check, 
  Coins, 
  Activity, 
  Shield, 
  CheckCircle, 
  Globe, 
  Code, 
  List, 
  Clock, 
  History, 
  Link2, 
  X,
  Terminal,
  ExternalLink,
  XCircle,
  AlertTriangle,
  Info,
  Settings as SettingsIcon
} from 'lucide-react';
import DataGrid, { type GridColumn, type FilterField } from '@/components/DataGrid';
import ProductModal from '@/components/ProductModal';
import PlanModal from '@/components/PlanModal';
import LicenseModal from '@/components/LicenseModal';
import DistributePieceModal from '@/components/DistributePieceModal';
import EventRegisterModal from '@/components/EventRegisterModal';
import EventSubscribeModal from '@/components/EventSubscribeModal';
import MessageTemplateModal from '@/components/MessageTemplateModal';
import ChannelSetupModal from '@/components/ChannelSetupModal';
import MessageLogDetailModal from '@/components/MessageLogDetailModal';
import AlertModal, { AlertType } from '@/components/AlertModal';
import { useLayout } from '@/context/LayoutContext';
import { generateCurl } from '@/lib/utils';
import {
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
  getEventLogs,
  resendEventLog
} from '@/lib/api';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getMessageLogs,
  resendMessageLog,
  getChannelSettings,
  setupChannel
} from '@/lib/messages-api';
import {
  listAppPaymentMethodSettings,
  setAppPaymentMethodSetting,
} from '@/lib/payment-api';
import type { AppPaymentMethodSetting } from '@/lib/payment-api';

type TabType = 'users' | 'product' | 'plan' | 'license' | 'subscriptions' | 'events' | 'messaging' | 'payment' | 'logs' | 'settings';
type EventSubTab = 'broadcast' | 'subscribe' | 'requests' | 'log';
type MessagingSubTab = 'setup' | 'templates' | 'logs';

// Duitku's `method` values are their own short channel codes (BC, SP, etc.) —
// map them to a friendly label for display. Keep in sync with
// DUITKU_PAYMENT_METHODS in PaymentFeeModal.tsx (that's where these rows get
// created) and DUITKU_METHOD_LABELS in bagdja-pay-web's checkout-client.tsx.
const DUITKU_METHOD_LABELS: Record<string, string> = {
  BC: 'BCA Virtual Account',
  M2: 'Mandiri Virtual Account',
  BT: 'Permata Virtual Account',
  B1: 'CIMB Niaga Virtual Account',
  VA: 'Maybank Virtual Account',
  I1: 'BNI Virtual Account',
  A1: 'ATM Bersama Virtual Account',
  OV: 'OVO',
  DA: 'DANA',
  SP: 'ShopeePay / QRIS',
  VC: 'Credit Card',
  FT: 'Retail (Indomaret/Alfamart)',
};

function getPaymentMethodLabel(method: AppPaymentMethodSetting): string {
  if (method.provider === 'duitku') {
    return DUITKU_METHOD_LABELS[method.method] ?? method.method;
  }
  return method.method.replaceAll('_', ' ').toUpperCase();
}

function getPaymentProviderLabel(provider: string): string {
  if (provider === 'duitku') return 'Duitku';
  if (provider === 'midtrans') return 'Midtrans';
  if (provider === 'internal-wallet' || provider === 'internal') return 'Bagdja Wallet';
  return provider.replaceAll('_', ' ');
}

export default function AppDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params?.id as string;
  const { setTopbarContent } = useLayout();
  const headerRef = useRef<HTMLDivElement>(null);

  const [app, setApp] = useState<ClientApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('users');

  // Contextual Topbar Logic
  const isHeaderVisibleRef = useRef(true);

  useEffect(() => {
    if (app) {
      setRedirectUris(app.oauthRedirectUris || []);
    }
  }, [app]);

  useEffect(() => {
    if (!app) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const currentlyVisible = entry.isIntersecting;

        // Only update if visibility status changed to avoid unnecessary events
        if (currentlyVisible !== isHeaderVisibleRef.current) {
          isHeaderVisibleRef.current = currentlyVisible;

          if (!currentlyVisible) {
            setTopbarContent(
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="p-1.5 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)]">
                  <Package className="h-4 w-4 text-[var(--action-primary)]" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-sm font-bold text-[var(--text-primary)] leading-none">{app.appName}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono uppercase tracking-tighter">ID: {app.appId}</span>
                    <span className={`text-[10px] font-bold uppercase px-1 rounded ${app.isActive ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                      {app.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            );
          } else {
            setTopbarContent(null);
          }
        }
      },
      {
        threshold: 0,
        rootMargin: '-64px 0px 0px 0px'
      }
    );

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => {
      observer.disconnect();
      setTopbarContent(null);
    };
  }, [app, setTopbarContent]);

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
  const [channelSettingsLoading, setChannelSettingsLoading] = useState(false);
  const [refreshTemplatesTrigger, setRefreshTemplatesTrigger] = useState(0);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [channelSetupModalOpen, setChannelSetupModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [msgLogDetailModalOpen, setMsgLogDetailModalOpen] = useState(false);
  const [selectedMsgLog, setSelectedMsgLog] = useState<any>(null);

  // Payment method settings state
  const [paymentMethodSettings, setPaymentMethodSettings] = useState<AppPaymentMethodSetting[]>([]);
  const [paymentMethodSettingsLoading, setPaymentMethodSettingsLoading] = useState(false);
  const [togglingPaymentMethodId, setTogglingPaymentMethodId] = useState<string | null>(null);

  // Platform Logs state
  const [selectedPlatformLog, setSelectedPlatformLog] = useState<any>(null);
  const [refreshPlatformLogs, setRefreshPlatformLogs] = useState(0);
  
  // Settings state
  const [redirectUris, setRedirectUris] = useState<string[]>([]);
  const [savingRedirectUris, setSavingRedirectUris] = useState(false);

  const platformLogColumns: GridColumn[] = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      sortable: true,
      render: (value: any) => (
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
          <Clock className="w-3 h-3" />
          {new Date(value).toLocaleString()}
        </div>
      ),
    },
    {
      key: 'level',
      label: 'Level',
      render: (value: any) => {
        const lvl = value.toLowerCase();
        switch (lvl) {
          case 'error':
            return <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-full border border-red-500/20 uppercase tracking-wider"><XCircle className="w-3 h-3" /> Error</span>;
          case 'warn':
            return <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-full border border-amber-500/20 uppercase tracking-wider"><AlertTriangle className="w-3 h-3" /> Warn</span>;
          case 'debug':
            return <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-500/10 text-gray-500 text-[10px] font-bold rounded-full border border-gray-500/20 uppercase tracking-wider"><Terminal className="w-3 h-3" /> Debug</span>;
          default:
            return <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded-full border border-blue-500/20 uppercase tracking-wider"><Info className="w-3 h-3" /> Info</span>;
        }
      },
    },
    {
      key: 'service',
      label: 'Service',
      render: (value: any) => (
        <span className="text-sm font-semibold text-[var(--text-primary)]">{value}</span>
      ),
    },
    {
      key: 'message',
      label: 'Message',
      render: (value: any, row: any) => (
        <div className="max-w-xl">
          <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed truncate">
            {value}
          </p>
          {row.tags && row.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {row.tags.map((tag: string) => (
                <span key={tag} className="px-1.5 py-0.5 bg-[var(--bg-surface)] text-[var(--text-secondary)] text-[10px] font-mono rounded border border-[var(--border-default)] opacity-80">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_: any, row: any) => (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPlatformLog(row);
          }}
          className="p-2 text-[var(--text-secondary)] hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
          title="View Details"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      ),
    }
  ];

  const platformLogFilterFields: FilterField[] = [
    {
      key: 'level',
      label: 'Log Level',
      type: 'select',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Warning', value: 'warn' },
        { label: 'Error', value: 'error' },
        { label: 'Debug', value: 'debug' },
      ],
    },
    {
      key: 'tags',
      label: 'Tags',
      type: 'text',
      placeholder: 'e.g. auth, login',
    },
    {
      key: 'service',
      label: 'Service',
      type: 'text',
      placeholder: 'Filter by Service',
    }
  ];

  // Global Alert State
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    message: string;
    type: AlertType;
    title?: string;
  }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const showAlert = (message: string, type: AlertType = 'info', title?: string) => {
    setAlertConfig({
      isOpen: true,
      message,
      type,
      title,
    });
  };

  const fetchChannelSettings = async () => {
    if (!app?.appId) return;
    try {
      setChannelSettingsLoading(true);
      const data = await getChannelSettings(app.appId);
      setChannelSettings(data);
    } catch (err) {
      console.error('Failed to fetch channel settings:', err);
    } finally {
      setChannelSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'messaging' && app?.appId) {
      fetchChannelSettings();
    }
  }, [activeTab, app?.appId]);

  const fetchPaymentMethodSettings = async () => {
    if (!app?.appId) return;
    try {
      setPaymentMethodSettingsLoading(true);
      const data = await listAppPaymentMethodSettings(app.appId, app.orgId);
      setPaymentMethodSettings(data);
    } catch (err) {
      console.error('Failed to fetch payment method settings:', err);
    } finally {
      setPaymentMethodSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'payment' && app?.appId) {
      fetchPaymentMethodSettings();
    }
  }, [activeTab, app?.appId]);

  const handleTogglePaymentMethod = async (method: AppPaymentMethodSetting) => {
    if (!app?.appId) return;
    const nextEnabled = !method.isEnabledForApp;
    try {
      setTogglingPaymentMethodId(method.id);
      await setAppPaymentMethodSetting(method.id, app.appId, nextEnabled, app.orgId);
      setPaymentMethodSettings((prev) =>
        prev.map((m) => (m.id === method.id ? { ...m, isEnabledForApp: nextEnabled } : m)),
      );
    } catch (err: any) {
      showAlert(err.message || 'Failed to update payment method', 'error', 'Update Failed');
    } finally {
      setTogglingPaymentMethodId(null);
    }
  };

  const handleChannelSetupSubmit = async (data: any) => {
    if (!app?.appId) return;
    try {
      await setupChannel({
        ...data,
        appId: app.appId,
      });
      await fetchChannelSettings();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to setup channel');
    }
  };

  const [resendingLogId, setResendingLogId] = useState<string | null>(null);
  const [resendingMsgLogId, setResendingMsgLogId] = useState<string | null>(null);

  const handleResendEvent = async (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    if (!app?.appId) return;

    try {
      setResendingLogId(logId);
      await resendEventLog(logId, app.appId);
      showAlert('Event has been successfully re-enqueued for delivery.', 'success', 'Delivery Triggered');
    } catch (err: any) {
      showAlert(err.message || 'Failed to resend event', 'error', 'Delivery Failed');
    } finally {
      setResendingLogId(null);
    }
  };

  const handleResendMessage = async (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    if (!app?.appId) return;

    try {
      setResendingMsgLogId(logId);
      await resendMessageLog(logId, app.appId);
      showAlert('Email has been successfully resent.', 'success', 'Message Sent');
    } catch (err: any) {
      showAlert(err.message || 'Failed to resend message', 'error', 'Resend Failed');
    } finally {
      setResendingMsgLogId(null);
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
    setRefreshTemplatesTrigger(prev => prev + 1);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    if (!app?.appId) return;
    try {
      await deleteTemplate(id, app.appId);
      setRefreshTemplatesTrigger(prev => prev + 1);
      showAlert('Template deleted successfully.', 'success');
    } catch (err) {
      showAlert('Failed to delete template', 'error');
    }
  };

  const handleAddRedirectUri = () => {
    setRedirectUris(prev => [...prev, '']);
  };

  const handleUpdateRedirectUri = (index: number, value: string) => {
    setRedirectUris(prev => {
      const newUris = [...prev];
      newUris[index] = value;
      return newUris;
    });
  };

  const handleRemoveRedirectUri = (index: number) => {
    setRedirectUris(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveRedirectUris = async () => {
    if (!app) return;
    try {
      setSavingRedirectUris(true);
      const cleanedUris = redirectUris.filter(uri => uri.trim() !== '');
      const updatedApp = await updateOAuthRedirectUris(app.id, cleanedUris);
      setApp(updatedApp);
      showAlert('OAuth redirect URIs saved successfully.', 'success');
    } catch (err: any) {
      showAlert(err.message || 'Failed to save redirect URIs', 'error');
    } finally {
      setSavingRedirectUris(false);
    }
  };



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
        const data = await getProducts(app.appId);
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
        const data = await getPlans(app.appId);
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
        const data = await getLicenses(app.appId);
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
        const data = await getPurchasedLicenses(app.appId);
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

  // Subscriptions tab — feature dinonaktifkan sementara (lihat render tab
  // di bawah). Endpoint `bagdja-auth` `/subscriptions/app/:appId` yg dulu
  // men-supply data ini sudah dihapus di refactoring-payment-service.md
  // Fase 1.D (Subscription entity di auth tidak lagi dipakai). Belum ada
  // pengganti di payment-service utk kasus "org lain berlangganan Plan app
  // ini" — lihat catatan di refactoring-payment-service.md §5.



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
      DAILY: `${durationValue} day${durationValue > 1 ? 's' : ''}`,
      WEEKLY: `${durationValue} week${durationValue > 1 ? 's' : ''}`,
      MONTHLY: `${durationValue} month${durationValue > 1 ? 's' : ''}`,
      YEARLY: `${durationValue} year${durationValue > 1 ? 's' : ''}`,
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
      case 'AVAILABLE':
        return 'bg-blue-500/10 text-blue-600';
      case 'PURCHASED':
        return 'bg-green-500/10 text-green-600';
      case 'REVOKED':
        return 'bg-red-500/10 text-red-600';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
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
    if (!app?.appId) return;
    try {
      setProductsLoading(true);
      setProductsError(null);
      const data = await getProducts(app.appId);
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
    if (!app?.appId) return;
    await createProduct(app.appId, data);
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
          orgId: app.orgId,
          orgSlug: app.orgId || 'bagdja',
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

  const handleEventSubscribe = async (contractId: string, webhookUrl?: string, label: string = 'default') => {
    if (!app?.appId) return;
    try {
      if (editingSubscription) {
        await updateMySubscription(editingSubscription.id, webhookUrl, app.appId, label);
      } else {
        await subscribeToEvent(contractId, webhookUrl, app.appId, label);
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
      label: sub.label,
      eventName: sub.contract?.eventName,
      contract: sub.contract
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
      await updateSubscriptionStatus(subId, status, app.appId);
      // Refresh grid by triggering refreshContracts state
      setRefreshContracts(prev => prev + 1);

      // Also update the local state for current count/notifications if needed
      const res = await getSubscriptionRequests(app.appId);
      setSubscriptionRequests(res.data || []);
      showAlert(`Subscription request ${status} successfully.`, 'success');
    } catch (err: any) {
      showAlert(err.message || 'Failed to update status', 'error');
    }
  };

  const handleUnsubscribe = async (subId: string) => {
    if (!confirm('Are you sure you want to unsubscribe from this event?')) return;
    if (!app?.appId) return;
    try {
      await deleteMySubscription(subId, app.appId);
      setRefreshContracts(prev => prev + 1);
      showAlert('Unsubscribed successfully.', 'success');
    } catch (err: any) {
      showAlert(err.message || 'Failed to unsubscribe', 'error');
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
      showAlert('Event contract deleted successfully.', 'success');
    } catch (err: any) {
      showAlert(err.message || 'Failed to delete event', 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteProduct(id);
      await refreshProducts();
      showAlert('Product deleted successfully.', 'success');
    } catch (err) {
      const apiError = err as ApiError;
      showAlert(apiError.message || 'Failed to delete product', 'error');
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
    if (!app?.appId) return;
    try {
      setPlansLoading(true);
      setPlansError(null);
      const data = await getPlans(app.appId);
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
    if (!app?.appId) return;
    await createPlan(app.appId, data);
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
      showAlert('Plan deleted successfully.', 'success');
    } catch (err) {
      const apiError = err as ApiError;
      showAlert(apiError.message || 'Failed to delete plan', 'error');
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
    if (!app?.appId) return;
    try {
      setLicensesLoading(true);
      setLicensesError(null);
      const data = await getLicenses(app.appId);
      setLicenses(data);

      // Also refresh purchased licenses if filter is 'sold'
      if (licenseFilter === 'sold') {
        try {
          setPurchasedLicensesLoading(true);
          setPurchasedLicensesError(null);
          const purchasedData = await getPurchasedLicenses(app.appId);
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
    if (!app?.appId) return;
    await createLicense(app.appId, data);
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
      showAlert('License deleted successfully.', 'success');
    } catch (err) {
      const apiError = err as ApiError;
      showAlert(apiError.message || 'Failed to delete license', 'error');
      console.error('Failed to delete license:', err);
    }
  };

  const openCreateLicenseModal = () => {
    setEditingLicense(null);
    setLicenseModalOpen(true);
  };

  const openEditLicenseModal = (license: License) => {
    if (license.status !== 'AVAILABLE') {
      showAlert('Only available licenses can be edited', 'warning');
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
    <div className="flex flex-col min-h-full space-y-6">
      {/* Back Button */}
      <div className="flex-shrink-0">
        <Link
          href="/applications/owned"
          className="inline-flex items-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Apps
        </Link>
      </div>

      {/* Header Section */}
      <div ref={headerRef} className="flex-shrink-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
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
      <div className="sticky top-0 z-10 border-b border-[var(--border-default)] bg-[var(--bg-main)] -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pt-4">
        <nav className="flex gap-8 overflow-x-auto no-scrollbar">
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
          <button
            onClick={() => setActiveTab('payment')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'payment'
              ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment
            </div>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'logs'
              ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Logs
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'settings'
              ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Settings
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] h-[calc(100vh-158px)] overflow-y-auto scrollbar-thin">
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
                            className={`px-2 py-1 rounded text-xs font-medium ${product.status === 'ACTIVE'
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
                            className={`px-2 py-1 rounded text-xs font-medium ${plan.isActive
                              ? 'bg-green-500/10 text-green-600'
                              : 'bg-gray-500/10 text-gray-600'
                              }`}
                          >
                            {plan.isActive ? 'Active' : 'Inactive'}
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
                displayData = licenses.filter((l) => l.status === 'AVAILABLE');
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
                                  {license.status === 'AVAILABLE' && (
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
          <div className="p-12 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
            <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
              Subscriptions temporarily unavailable
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-md mx-auto">
              This feature relied on the legacy `Subscription` entity in bagdja-auth,
              which has been removed as part of the Product/Plan/License refactor to
              bagdja-payment-service. It will return once an equivalent is implemented there.
            </p>
          </div>
        )}

        {/* Event Tab */}
        {activeTab === 'events' && (
          <div className="p-6 h-full flex flex-col overflow-hidden">
            <div className="flex-shrink-0 mb-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Event Management</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Manage broadcasting, subscriptions, and logs for this application
              </p>
            </div>

            {/* Sub-tabs */}
            <div className="flex-shrink-0 flex gap-4 border-b border-[var(--border-default)] mb-6">
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
                  {subscriptionRequests.filter((r: any) => r.status === 'PENDING').length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                      {subscriptionRequests.filter((r: any) => r.status === 'PENDING').length}
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

            {/* Sub-tab Content */}
            <div className="flex-1 min-h-0 flex flex-col">
              {eventSubTab === 'broadcast' && (
                <DataGrid
                  title="Your Event Contracts"
                  description="Manage events that this application broadcasts to the hub."
                  fetchData={(params) => getInfraContracts({ ...params, filter: { ...params.filter, appId: app?.appId } })}
                  refreshTrigger={refreshContracts}
                  isScrollable={true}
                  fullHeight={true}
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
                  isScrollable={true}
                  fullHeight={true}
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
                      label: 'Webhook/Label',
                      sortable: true,
                      render: (val, row) => (
                        <div className="flex flex-col gap-1">
                          {val ? (
                            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                              <Link2 className="h-3.5 w-3.5" />
                              <span className="text-xs truncate max-w-[150px]" title={val}>{val}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">WebSocket Only</span>
                          )}
                          {row.label && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary uppercase">
                              <List className="h-3 w-3" /> {row.label}
                            </span>
                          )}
                        </div>
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
                  isScrollable={true}
                  fullHeight={true}
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
                      label: 'Webhook/Label',
                      render: (val, row) => (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-[var(--text-secondary)] font-mono">{val || 'WebSocket Only'}</span>
                          {row.label && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary uppercase">
                              <List className="h-3 w-3" /> {row.label}
                            </span>
                          )}
                        </div>
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
                  isScrollable={true}
                  fullHeight={true}
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
                    },
                    {
                      key: 'actions',
                      label: '',
                      render: (_, row) => (
                        <div className="flex justify-end">
                          {row.type === 'delivery' && (
                            <button
                              onClick={(e) => handleResendEvent(e, row.id)}
                              disabled={resendingLogId === row.id}
                              className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                              {resendingLogId === row.id ? (
                                <History className="h-3 w-3 animate-spin" />
                              ) : null}
                              {resendingLogId === row.id ? 'Resending...' : 'Resend'}
                            </button>
                          )}
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
          </div>
        )}

        {/* Messaging Tab */}
        {activeTab === 'messaging' && (
          <div className="p-6 h-full flex flex-col overflow-hidden">
            <div className="flex-shrink-0 mb-6">
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
              <div className="flex-shrink-0 mb-6 flex items-center justify-between">
                <button
                  onClick={() => setActiveChannel(null)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Channels
                </button>
              </div>
            )}

            {!activeChannel ? (
              <div className="flex-1 overflow-y-auto">
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
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col">
                {/* Sub-tabs for the Active Channel */}
                <div className="flex-shrink-0 flex items-center gap-1 p-1 bg-white/5 rounded-lg w-fit mb-8">
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
                <div className="flex-1 min-h-0 flex flex-col">
                  {messagingSubTab === 'setup' && (
                    <div className="max-w-2xl overflow-y-auto">
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
                          {channelSettings.find(s => s.channelType === activeChannel)?.providerType === 'SYSTEM' || !channelSettings.find(s => s.channelType === activeChannel) ? (
                            <span className="px-3 py-1 bg-green-500/10 text-green-400 text-[10px] font-black uppercase rounded-full border border-green-500/20">
                              System Default
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase rounded-full border border-blue-500/20">
                              {channelSettings.find(s => s.channelType === activeChannel)?.providerType}
                            </span>
                          )}
                        </div>

                        <div className="space-y-6">
                          <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-start gap-4">
                            <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-[var(--text-primary)]">
                                {channelSettings.find(s => s.channelType === activeChannel)?.providerType === 'SYSTEM' || !channelSettings.find(s => s.channelType === activeChannel)
                                  ? 'Using Bagdja Infrastructure'
                                  : `Using Custom ${channelSettings.find(s => s.channelType === activeChannel)?.providerType}`}
                              </p>
                              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                {channelSettings.find(s => s.channelType === activeChannel)?.providerType === 'SYSTEM' || !channelSettings.find(s => s.channelType === activeChannel)
                                  ? `Your application is currently using the shared Bagdja messaging service (noreply@bagdja.com). No setup required.`
                                  : `Your application is using a custom ${activeChannel} provider. Settings are managed by your team.`}
                              </p>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-[var(--border-default)]">
                            <button
                              onClick={() => setChannelSetupModalOpen(true)}
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
                    <div className="flex-1 min-h-0 flex flex-col">
                      <DataGrid
                        title={`${activeChannel.charAt(0).toUpperCase() + activeChannel.slice(1)} Templates`}
                        description={`Manage your ${activeChannel} templates using Handlebars syntax.`}
                        fetchData={(params) => getTemplates(app?.appId, { ...params, channelType: activeChannel })}
                        refreshTrigger={refreshTemplatesTrigger}
                        isScrollable={true}
                        fullHeight={true}
                        actions={[
                          {
                            label: '',
                            icon: <Plus className="h-4 w-4" />,
                            onClick: () => {
                              setEditingTemplate(null);
                              setTemplateModalOpen(true);
                            },
                            variant: 'secondary'
                          }
                        ]}
                        columns={[
                          {
                            key: 'name',
                            label: 'Template Name',
                            sortable: true,
                            render: (val) => (
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                  <Code className="h-4 w-4" />
                                </div>
                                <span className="font-bold text-[var(--text-primary)]">{val}</span>
                              </div>
                            )
                          },
                          {
                            key: 'subject',
                            label: 'Subject',
                            sortable: true,
                            render: (val) => (
                              <span className="text-sm text-[var(--text-secondary)] italic truncate max-w-[300px] block">
                                {val || '-'}
                              </span>
                            )
                          },
                          {
                            key: 'updatedAt',
                            label: 'Last Updated',
                            sortable: true,
                            render: (val) => (
                              <span className="text-xs text-[var(--text-secondary)] font-mono">
                                {new Date(val).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )
                          },
                          {
                            key: 'actions',
                            label: 'Actions',
                            render: (_, row) => (
                              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => {
                                    setEditingTemplate(row);
                                    setTemplateModalOpen(true);
                                  }}
                                  className="p-2 text-[var(--text-secondary)] hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                  title="Edit Template"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTemplate(row.id)}
                                  className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                  title="Delete Template"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )
                          }
                        ]}
                        filterFields={[
                          { key: 'name', label: 'Template Name', type: 'text', placeholder: 'e.g. welcome-email' },
                          { key: 'subject', label: 'Subject', type: 'text', placeholder: 'e.g. Welcome to Bagdja' }
                        ]}
                        emptyState={{
                          title: `No ${activeChannel} templates yet`,
                          description: `Define your ${activeChannel} templates using Handlebars syntax.`,
                          icon: <Code className="h-8 w-8 text-[var(--text-secondary)] opacity-50" />
                        }}
                      />
                    </div>
                  )}

                  {messagingSubTab === 'logs' && (
                    <div className="flex-1 min-h-0 flex flex-col">
                      <DataGrid
                        title={`${activeChannel.charAt(0).toUpperCase() + activeChannel.slice(1)} Delivery Logs`}
                        description={`Detailed history of ${activeChannel} messages sent from this application.`}
                        fetchData={(params) => getMessageLogs(app?.appId, { ...params, filter: { ...params.filter, channelType: activeChannel } })}
                        isScrollable={true}
                        fullHeight={true}
                        onRowClick={(row) => {
                          setSelectedMsgLog(row);
                          setMsgLogDetailModalOpen(true);
                        }}
                        columns={[
                          {
                            key: 'status',
                            label: 'Status',
                            sortable: true,
                            render: (val) => (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${val === 'sent' || val === 'delivered'
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : val === 'failed'
                                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                {val}
                              </span>
                            )
                          },
                          {
                            key: 'recipient',
                            label: 'Recipient',
                            sortable: true,
                            render: (val) => (
                              <span className="text-sm font-medium text-[var(--text-primary)]">{val}</span>
                            )
                          },
                          {
                            key: 'templateName',
                            label: 'Template',
                            sortable: true,
                            render: (val) => (
                              <span className="text-xs text-[var(--text-secondary)] font-mono">{val}</span>
                            )
                          },
                          {
                            key: 'subject',
                            label: 'Subject',
                            sortable: true,
                            render: (val) => (
                              <span className="text-sm text-[var(--text-secondary)] truncate max-w-[200px]" title={val}>
                                {val || '-'}
                              </span>
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
                                    second: '2-digit'
                                  })}
                                </span>
                              </div>
                            )
                          },
                          {
                            key: 'actions',
                            label: '',
                            render: (_, row) => (
                              <div className="flex justify-end">
                                <button
                                  onClick={(e) => handleResendMessage(e, row.id)}
                                  disabled={resendingMsgLogId === row.id}
                                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                  {resendingMsgLogId === row.id ? (
                                    <History className="h-3 w-3 animate-spin" />
                                  ) : null}
                                  {resendingMsgLogId === row.id ? 'Resending...' : 'Resend'}
                                </button>
                              </div>
                            )
                          }
                        ]}
                        filterFields={[
                          { key: 'recipient', label: 'Recipient', type: 'text', placeholder: 'e.g. user@example.com' },
                          { key: 'templateName', label: 'Template', type: 'text', placeholder: 'e.g. welcome-email' },
                          {
                            key: 'status',
                            label: 'Status',
                            type: 'select',
                            options: [
                              { label: 'Sent', value: 'sent' },
                              { label: 'Delivered', value: 'delivered' },
                              { label: 'Failed', value: 'failed' },
                              { label: 'Pending', value: 'pending' }
                            ]
                          }
                        ]}
                        emptyState={{
                          title: "No delivery history",
                          description: `Once your application starts sending ${activeChannel}s, the detailed delivery logs will appear here.`,
                          icon: <History className="h-8 w-8 text-[var(--text-secondary)] opacity-50" />
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment Tab */}
        {activeTab === 'payment' && (
          <div className="p-6 h-full flex flex-col overflow-hidden">
            <div className="flex-shrink-0 mb-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Payment Methods</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Enable or disable the payment methods your buyers can use at checkout. Methods here are
                configured by Bagdja for your app — you can only turn them off, not add new ones.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {paymentMethodSettingsLoading ? (
                <div className="flex items-center justify-center py-16 text-[var(--text-secondary)] text-sm">
                  Loading payment methods...
                </div>
              ) : paymentMethodSettings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CreditCard className="h-8 w-8 text-[var(--text-secondary)] opacity-50 mb-3" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    No payment methods have been configured for your app yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-w-2xl">
                  {paymentMethodSettings.map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-default)] bg-white/5"
                    >
                      <div>
                        <p className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                          {getPaymentProviderLabel(method.provider)}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{getPaymentMethodLabel(method)}</p>
                      </div>
                      <button
                        role="switch"
                        aria-checked={method.isEnabledForApp}
                        disabled={togglingPaymentMethodId === method.id}
                        onClick={() => handleTogglePaymentMethod(method)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${method.isEnabledForApp ? 'bg-[var(--action-primary)]' : 'bg-white/10'
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${method.isEnabledForApp ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="p-6 h-full flex flex-col">
            <DataGrid
              title="Application Logs"
              description={`Infrastructure and service logs for ${app.appName}`}
              columns={platformLogColumns}
              fetchData={async (params) => {
                const { page, size, search, filter } = params;
                const offset = (page - 1) * size;
                const response = await getLogs({
                  appId: app.appId,
                  search: search || undefined,
                  service: filter.service || undefined,
                  level: filter.level || undefined,
                  tags: filter.tags || undefined,
                  limit: size,
                  offset,
                });
                return {
                  data: response.items,
                  meta: {
                    totalItems: response.total,
                    currentPage: page,
                    itemsPerPage: size,
                    totalPages: Math.ceil(response.total / size)
                  }
                };
              }}
              filterFields={platformLogFilterFields}
              refreshTrigger={refreshPlatformLogs}
              onRowClick={(row) => setSelectedPlatformLog(row)}
              isScrollable={true}
              fullHeight={true}
              emptyState={{
                title: 'No logs found',
                description: 'Service logs for this application will appear here.',
                icon: <Terminal className="w-12 h-12 text-[var(--text-secondary)] opacity-20" />
              }}
            />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="p-6 space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">OAuth Redirect URIs</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Manage the whitelist of redirect URIs allowed for OAuth authentication.
              </p>
            </div>

            <div className="space-y-4">
              {redirectUris.map((uri, index) => (
                <div key={index} className="flex items-center gap-4">
                  <input
                    type="url"
                    value={uri}
                    onChange={(e) => handleUpdateRedirectUri(index, e.target.value)}
                    placeholder="https://example.com/callback"
                    className="flex-1 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent"
                  />
                  <button
                    onClick={() => handleRemoveRedirectUri(index)}
                    className="p-3 text-[var(--text-danger)] hover:bg-[var(--text-danger)]/10 rounded-lg transition-all"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}

              <button
                onClick={handleAddRedirectUri}
                className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-dashed border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--action-primary)] rounded-lg transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Redirect URI
              </button>
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--border-default)]">
              <button
                onClick={handleSaveRedirectUris}
                disabled={savingRedirectUris}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--action-primary)] text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {savingRedirectUris ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {
        app && (
          <ProductModal
            isOpen={productModalOpen}
            onClose={closeProductModal}
            onSubmit={handleProductSubmit}
            product={editingProduct}
            appId={app.appId}
          />
        )
      }

      {/* Plan Modal */}
      {
        app && (
          <PlanModal
            isOpen={planModalOpen}
            onClose={closePlanModal}
            onSubmit={handlePlanSubmit}
            plan={editingPlan}
            appId={app.appId}
          />
        )
      }

      {/* License Modal */}
      {
        app && (
          <LicenseModal
            isOpen={licenseModalOpen}
            onClose={closeLicenseModal}
            onSubmit={handleLicenseSubmit}
            license={editingLicense}
            appId={app.appId}
          />
        )
      }

      {/* Distribute BP Modal */}
      {
        app && (
          <DistributePieceModal
            isOpen={distributePieceModalOpen}
            onClose={() => setDistributePieceModalOpen(false)}
            users={appUsers}
            appId={app.id}
            onSuccess={() => {
              // Optionally refresh users or show success message
            }}
          />
        )
      }

      {/* Event Register Modal */}
      {
        app && (
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
        )
      }

      {/* Event Subscribe Modal */}
      {
        app && (
          <EventSubscribeModal
            isOpen={eventSubscribeModalOpen}
            onClose={() => {
              setEventSubscribeModalOpen(false);
              setEditingSubscription(null);
            }}
            onSubmit={handleEventSubscribe}
            initialData={editingSubscription}
          />
        )
      }

      {/* Message Template Modal */}
      {
        app && activeChannel && (
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
        )
      }

      {/* Channel Setup Modal */}
      {
        app && activeChannel && (
          <ChannelSetupModal
            isOpen={channelSetupModalOpen}
            onClose={() => setChannelSetupModalOpen(false)}
            onSubmit={handleChannelSetupSubmit}
            channelType={activeChannel}
            initialData={channelSettings.find(s => s.channelType === activeChannel)}
          />
        )
      }

      <MessageLogDetailModal
        isOpen={msgLogDetailModalOpen}
        onClose={() => setMsgLogDetailModalOpen(false)}
        log={selectedMsgLog}
        onResend={handleResendMessage}
        resendingId={resendingMsgLogId}
      />

      {/* Event Log Detail Modal */}
      {
        logDetailModalOpen && selectedLog && (
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
                        showAlert('Payload copied to clipboard', 'info');
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-[var(--text-secondary)] transition-all opacity-0 group-hover:opacity-100"
                      title="Copy Payload"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* CURL Debugger (for Deliveries) */}
                {selectedLog.type === 'delivery' && selectedLog.targetUrl && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase px-1">CURL Debugger (Simulate Request)</span>
                    <div className="relative group">
                      <pre className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[10px] font-mono text-amber-200/70 overflow-x-auto leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
                        {generateCurl(selectedLog.targetUrl, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-Bagdja-Event': selectedLog.eventName,
                            'X-Bagdja-Delivery': selectedLog.id,
                          },
                          body: {
                            eventName: selectedLog.eventName,
                            appId: app?.appId,
                            data: selectedLog.payload,
                            timestamp: selectedLog.createdAt,
                          }
                        })}
                      </pre>
                      <button
                        onClick={() => {
                          const curl = generateCurl(selectedLog.targetUrl, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'X-Bagdja-Event': selectedLog.eventName,
                              'X-Bagdja-Delivery': selectedLog.id,
                            },
                            body: {
                              eventName: selectedLog.eventName,
                              appId: app?.appId,
                              data: selectedLog.payload,
                              timestamp: selectedLog.createdAt,
                            }
                          });
                          navigator.clipboard.writeText(curl);
                          showAlert('CURL command copied to clipboard', 'success', 'Ready to Debug');
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/20 text-amber-400 transition-all opacity-0 group-hover:opacity-100"
                        title="Copy CURL Command"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-[9px] text-amber-500/50 italic px-1">
                      * Use this command to manually test your webhook endpoint with the exact same payload and headers.
                    </p>
                  </div>
                )}
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
        )
      }

      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        message={alertConfig.message}
        type={alertConfig.type}
        title={alertConfig.title}
        autoClose={alertConfig.type === 'success' || alertConfig.type === 'info' ? 3000 : undefined}
      />

      {/* Platform Log Detail Modal */}
      {selectedPlatformLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--border-default)] flex items-center justify-between flex-shrink-0 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)]">Log Details</h3>
                  <p className="text-xs text-[var(--text-secondary)] font-mono uppercase tracking-wider">{selectedPlatformLog.id || 'N/A'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPlatformLog(null)}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Status & Quick Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-default)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block">Timestamp</span>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {new Date(selectedPlatformLog.timestamp).toLocaleString(undefined, {
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
                <div className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-default)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block">Level</span>
                  <div>
                    {(() => {
                      const lvl = selectedPlatformLog.level.toLowerCase();
                      switch (lvl) {
                        case 'error':
                          return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase">Error</span>;
                        case 'warn':
                          return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">Warning</span>;
                        default:
                          return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase">{lvl}</span>;
                      }
                    })()}
                  </div>
                </div>
                <div className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-default)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block">Service</span>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{selectedPlatformLog.service}</p>
                </div>
                <div className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-default)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block">App ID</span>
                  <p className="text-sm font-mono text-[var(--text-primary)]">{selectedPlatformLog.appId}</p>
                </div>
              </div>

              {/* Message Banner */}
              <div className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-default)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Message</span>
                </div>
                <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed">
                  {selectedPlatformLog.message}
                </p>
              </div>

              {/* Tags */}
              {selectedPlatformLog.tags && selectedPlatformLog.tags.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest px-1">Tags</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlatformLog.tags.map((tag: string) => (
                      <span key={tag} className="px-3 py-1 bg-primary/5 text-primary text-xs font-medium rounded-full border border-primary/10">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Data/Meta Viewer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Structured Data</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedPlatformLog.data || selectedPlatformLog.meta || {}, null, 2));
                      showAlert('JSON copied to clipboard', 'success');
                    }}
                    className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                  >
                    Copy JSON
                  </button>
                </div>
                <div className="bg-gray-900 rounded-2xl p-6 overflow-hidden border border-white/5 shadow-inner">
                  <pre className="text-xs text-green-400 font-mono overflow-x-auto custom-scrollbar leading-relaxed">
                    {JSON.stringify(selectedPlatformLog.data || selectedPlatformLog.meta || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border-default)] flex justify-end flex-shrink-0 bg-white/5">
              <button 
                onClick={() => setSelectedPlatformLog(null)}
                className="px-8 py-2.5 bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl text-sm font-bold border border-[var(--border-default)] hover:bg-white/5 transition-all uppercase tracking-widest"
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
