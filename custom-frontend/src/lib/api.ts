import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  Post,
  Integration,
  ApiError,
} from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      ...options,
      credentials: 'include', // Important for cookies!
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Don't set Content-Type for FormData
    if (options.body instanceof FormData) {
      delete (config.headers as Record<string, string>)['Content-Type'];
    }

    try {
      const response = await fetch(url, config);

      // Handle specific response headers
      const reload = response.headers.get('reload');
      const onboarding = response.headers.get('onboarding');
      const activate = response.headers.get('activate');

      if (reload) {
        window.location.reload();
      }

      if (onboarding) {
        window.location.href = '/onboarding';
      }

      if (activate) {
        window.location.href = '/activate';
      }

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          message: response.statusText,
          statusCode: response.status,
        }));
        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      if ((error as ApiError).statusCode) {
        throw error;
      }
      throw {
        message: 'Network error. Please check your connection.',
        statusCode: 0,
      } as ApiError;
    }
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    // Clear auth cookie by calling backend logout if exists
    // Or just clear local state
    return this.request<void>('/auth/logout', {
      method: 'POST',
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/user');
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request('/auth/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Posts endpoints
  async getPosts(page = 1, limit = 10): Promise<{ posts: Post[]; total: number }> {
    return this.request(`/posts?page=${page}&limit=${limit}`);
  }

  async getPost(id: string): Promise<Post> {
    return this.request(`/posts/${id}`);
  }

  async createPost(data: Partial<Post>): Promise<Post> {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePost(id: string, data: Partial<Post>): Promise<Post> {
    return this.request(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePost(id: string): Promise<void> {
    return this.request(`/posts/${id}`, {
      method: 'DELETE',
    });
  }

  // Integrations endpoints
  async getIntegrations(): Promise<Integration[]> {
    return this.request('/integrations');
  }

  async getIntegration(id: string): Promise<Integration> {
    return this.request(`/integrations/${id}`);
  }

  async deleteIntegration(id: string): Promise<void> {
    return this.request(`/integrations/${id}`, {
      method: 'DELETE',
    });
  }

  // Media endpoints
  async uploadMedia(file: File): Promise<{ url: string; id: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/media/upload', {
      method: 'POST',
      body: formData,
    });
  }
}

export const apiClient = new ApiClient(API_URL);
