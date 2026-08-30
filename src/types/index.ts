export interface LoginRequest {
  username: string; // Can be username or email
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  redirectUri?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  authProvider?: string;
  profilePicture?: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}

export interface ClientTokenRequest {
  app_id: string;
  app_secret: string;
}

export interface ClientTokenResponse {
  'x-api-token': string;
  token_type: string;
  expires_in: number;
}

export interface Organization {
  id: string;
  name: string;
  orgId: string;
  description?: string;
  isActive: boolean;
  isSystemOrg?: boolean;
  logo?: string;
  contactEmail?: string;
  createdAt?: Date;
  updatedAt?: Date;
  role?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface CreateOrganizationRequest {
  name: string;
  orgId?: string;
  description?: string;
  logo?: string;
  contactEmail?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  orgId?: string;
  description?: string;
  logo?: string;
  contactEmail?: string;
}

export interface ClientApp {
  id: string;
  appId: string;
  appName: string;
  description?: string;
  contactEmail?: string;
  logo?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  userId: string;
  orgId: string;
  orgUuid: string;
  appSlug?: string;
  isCoreService?: boolean;
  app_secret?: string; // Only returned once during creation/regeneration
  oauthRedirectUris?: string[];
}

export interface CreateClientAppRequest {
  app_id: string;
  app_name: string;
  description?: string;
  contact_email?: string;
  logo?: string;
}

export interface Asset {
  id: string;
  orgId: string;
  createdBy: string;
  group: string; // Group name (for backward compatibility)
  groupId: string; // Asset Group ID
  name: string;
  mimeType: string;
  storageKey: string;
  publicUrl?: string;
  size: number;
  width?: number;
  height?: number;
  createdAt: Date;
}

export interface CreateAssetRequest {
  file: File;
  groupId: string; // Asset Group ID
  name?: string;
}

export interface AssetGroup {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  createdBy: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssetGroupRequest {
  name: string;
  description?: string;
}

export interface UpdateAssetGroupRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// License Types
export enum LicenseType {
  ORG = 'ORG',
  APP = 'APP',
}

export enum LicenseStatus {
  AVAILABLE = 'AVAILABLE',
  PURCHASED = 'PURCHASED',
  REVOKED = 'REVOKED',
}

// Dipindah dari bagdja-auth ke bagdja-payment-service (lihat
// refactoring-payment-service.md §3.3). `orgId` sekarang string opaque
// (slug), bukan lagi FK ke tabel organizations.
export interface License {
  id: string;
  appId: string;
  appName?: string;
  type: LicenseType;
  maxUsers: number;
  expTime: number | null;
  price: number;
  currency: string;
  licenseKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any> | null;
  status: LicenseStatus;
  orgId: string | null;
  organizationName?: string | null;
  purchasedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLicenseRequest {
  type: LicenseType;
  maxUsers: number;
  expTime?: number | null;
  price: number;
  currency?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface UpdateLicenseRequest {
  type?: LicenseType;
  maxUsers?: number;
  expTime?: number | null;
  price?: number;
  currency?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface BuyLicenseResponse {
  licenseId: string;
  licenseKey: string;
  amount: number;
  currency: string;
  platformFeeAmount: number;
  orgId: string | null;
  purchasedAt: Date | null;
  expiresAt: Date | null;
}

// Plan Types — sekarang "Subscription Plan" di bagdja-payment-service
// (merge dgn Plan lama bagdja-auth, lihat refactoring-payment-service.md §3.2).
export enum PlanDuration {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export interface Plan {
  id: string;
  appId: string;
  orgId: string;
  /** Slug unik per app+org, auto-generate dari `name` kalau tidak diisi */
  code: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration: PlanDuration;
  durationValue: number | null;
  /** UI tetap menampilkan sbg list string; disimpan sbg `{ list: string[] }` di `features` */
  features: string[] | null;
  trialPeriodDays: number | null;
  /** Fase 1 freemium-and-trial-subscription-decision.md §2 — null = tidak dibatasi */
  maxRedemptionsPerOwner: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any> | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlanRequest {
  code?: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  duration: PlanDuration;
  durationValue?: number;
  features?: string[];
  maxRedemptionsPerOwner?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdatePlanRequest {
  code?: string;
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  duration?: PlanDuration;
  durationValue?: number;
  features?: string[];
  maxRedemptionsPerOwner?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  isActive?: boolean;
}

// Product Types
export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface Product {
  id: string;
  appId: string;
  name: string;
  description: string | null;
  price: number;
  type: string; // Free text
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any> | null;
  status: ProductStatus;
  isActive: boolean;
  isDynamic: boolean;
  prices?: { currency: string; price: number }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  type: string; // Free text
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  status?: ProductStatus;
  isActive?: boolean;
  isDynamic?: boolean;
  prices?: { currency: string; price: number }[];
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  type?: string; // Free text
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  status?: ProductStatus;
  isActive?: boolean;
  isDynamic?: boolean;
  prices?: { currency: string; price: number }[];
}

// Escrow Product Types — katalog/policy untuk item yang dijual via escrow
// milestone (`bagdja-payment-service` `escrow_products`, tabel dedicated
// sejak 2026-08-19, lihat
// plan/payment-service/escrow-milestone-decision.md §3.0 supersede #12).
// Terpisah dari `Product` di atas — beda tabel, beda tujuan (policy escrow,
// bukan katalog jualan generik).
export interface EscrowProduct {
  id: string;
  appId: string;
  name: string;
  description: string | null;
  currency: string;
  price: number | null;
  isDynamic: boolean;
  isActive: boolean;
  status: ProductStatus;
  releaseMode: string;
  milestoneRequired: boolean;
  allowPartialMilestoneRelease: boolean;
  disputeEnabled: boolean;
  releaseWindowEnforced: boolean;
  fullPaymentRequired: boolean;
  allowedPaymentMethods: string[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEscrowProductRequest {
  name: string;
  description?: string;
  currency?: string;
  price?: number;
  isDynamic?: boolean;
  isActive?: boolean;
  status?: ProductStatus;
  releaseMode?: string;
  milestoneRequired?: boolean;
  allowPartialMilestoneRelease?: boolean;
  disputeEnabled?: boolean;
  releaseWindowEnforced?: boolean;
  fullPaymentRequired?: boolean;
  allowedPaymentMethods?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export type UpdateEscrowProductRequest = Partial<CreateEscrowProductRequest>;

// Subscription Types — model BARU dari `bagdja-payment-service`
// (`SubscriptionDto`, lihat refactoring-payment-service.md §7 Track 2
// Fase 1.G). BUKAN pengganti 1:1 model lama `bagdja-auth` yang dihapus di
// Fase 1.D — beda skema total (billing period, proration, wallet-based).
export enum SubscriptionStatus {
  TRIALING = 'TRIALING',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export interface Subscription {
  id: string;
  planId: string;
  /** Diisi client-side dari `getPlans(appId)` — payment-service tidak nge-join plan di response ini */
  planName?: string;
  planCode?: string;
  appId: string;
  orgId: string | null;
  userId: string | null;
  walletId: string;
  platformOrgId: string;
  lockedAmount: number;
  currency: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
  failedAttemptCount: number;
  gracePeriodEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// App User Types (Response from API)
export interface AppUser {
  id: string;
  email: string;
  username: string;
  name?: string;
  joinedDate: Date;
  lastActivity: Date;
  status: 'Active' | 'Inactive';
  transactionCount: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Message Service Types
export enum ChannelType {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
}

export enum ProviderType {
  SYSTEM = 'system',
  SMTP = 'smtp',
  SENDGRID = 'sendgrid',
  MAILGUN = 'mailgun',
}

export interface ChannelSetting {
  id: string;
  appId: string;
  channelType: ChannelType;
  providerType: ProviderType;
  config: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageTemplate {
  id: string;
  appId: string;
  name: string;
  channelType: ChannelType;
  subject?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTemplateRequest {
  appId?: string;
  name: string;
  channelType: ChannelType;
  subject?: string;
  content: string;
}

export interface UpdateTemplateRequest {
  appId?: string;
  name?: string;
  subject?: string;
  content?: string;
}

export interface SetupChannelRequest {
  channelType: ChannelType;
  providerType: ProviderType;
  config: any;
}

export interface TestConnectionRequest {
  to: string;
  providerType: ProviderType;
  config: any;
}
