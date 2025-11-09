// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  username?: string;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  username?: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Post types
export interface Post {
  id: string;
  content: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  publishDate?: string;
  createdAt: string;
  updatedAt: string;
  integration?: Integration;
}

// Integration types
export interface Integration {
  id: string;
  name: string;
  type: string;
  providerIdentifier: string;
  picture?: string;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Error
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
