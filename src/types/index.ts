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
  slug?: string;
  description?: string;
  isActive: boolean;
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
  slug?: string;
  description?: string;
  logo?: string;
  contactEmail?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  slug?: string;
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
  app_secret?: string; // Only returned once during creation/regeneration
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
  ORG = 'org',
  APP = 'app',
}

export enum LicenseStatus {
  AVAILABLE = 'available',
  PURCHASED = 'purchased',
  REVOKED = 'revoked',
}

export interface License {
  id: string;
  appId: string;
  appName?: string;
  type: LicenseType;
  maxUsers: number;
  expTime: number | null;
  price: number;
  licenseKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any> | null;
  status: LicenseStatus;
  organizationId: string | null;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface UpdateLicenseRequest {
  type?: LicenseType;
  maxUsers?: number;
  expTime?: number | null;
  price?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface BuyLicenseResponse {
  licenseKey: string;
  licenseId: string;
  transactionId: string;
}

// Plan Types
export enum PlanDuration {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum PlanStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface Plan {
  id: string;
  appId: string;
  name: string;
  description: string | null;
  price: number;
  duration: PlanDuration;
  durationValue: number | null;
  features: string[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any> | null;
  status: PlanStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlanRequest {
  name: string;
  description?: string;
  price: number;
  duration: PlanDuration;
  durationValue?: number;
  features?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  status?: PlanStatus;
  isActive?: boolean;
}

export interface UpdatePlanRequest {
  name?: string;
  description?: string;
  price?: number;
  duration?: PlanDuration;
  durationValue?: number;
  features?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  status?: PlanStatus;
  isActive?: boolean;
}

// Product Types
export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
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
}

// Subscription Types
export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planName?: string;
  startDate: Date;
  endDate: Date;
  status: SubscriptionStatus;
  transactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// App User Types
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

