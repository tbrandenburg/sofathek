import { config } from '../types';
import { ApiResponse, HealthCheck, LoginCredentials, AuthResponse, User } from '../types';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.apiBaseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('token');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.request<AuthResponse['data']>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(): Promise<ApiResponse<null>> {
    const result = await this.request<null>('/auth/logout', {
      method: 'POST',
    });
    localStorage.removeItem('token');
    return result;
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/profile');
  }

  // Health check
  async getHealth(): Promise<ApiResponse<HealthCheck>> {
    return this.request<HealthCheck>('/health');
  }

  // Users endpoints
  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>('/users');
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`);
  }
}

export const api = new ApiService();
export default api;