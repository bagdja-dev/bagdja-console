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

