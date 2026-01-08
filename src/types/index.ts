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

