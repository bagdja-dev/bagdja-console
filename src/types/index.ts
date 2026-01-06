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

