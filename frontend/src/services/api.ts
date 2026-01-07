import { config } from '../types';
import {
  ApiResponse,
  HealthCheck,
  LoginCredentials,
  AuthResponse,
  User,
  Video,
  VideoLibrary,
  LibraryFilters,
  DownloadJob,
  DownloadRequest,
  DownloadQueue,
  SystemStatus,
} from '../types';

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

  // For direct API calls without wrapper (used by media endpoints)
  private async directRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
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

  // === SOFATHEK MEDIA CENTER ENDPOINTS ===

  // Video Library API
  async getVideos(filters: LibraryFilters = {}): Promise<VideoLibrary> {
    const params = new URLSearchParams();

    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const query = params.toString();
    return this.directRequest(`/videos${query ? `?${query}` : ''}`);
  }

  async getVideo(id: string): Promise<Video> {
    return this.directRequest(`/videos/${id}`);
  }

  async getVideoCategories(): Promise<{ categories: string[]; total: number }> {
    return this.directRequest('/videos/categories');
  }

  async scanLibrary(category?: string): Promise<{
    message: string;
    results: {
      scanned: number;
      found: number;
      processed: number;
      errors: number;
      newVideos: number;
    };
  }> {
    return this.directRequest('/videos/scan', {
      method: 'POST',
      body: JSON.stringify(category ? { category } : {}),
    });
  }

  // Video Streaming URLs
  getVideoStreamUrl(id: string): string {
    return `${this.baseUrl}/videos/${id}/stream`;
  }

  getThumbnailUrl(id: string): string {
    return `${this.baseUrl}/videos/${id}/thumbnail`;
  }

  // YouTube Downloads API
  async queueDownload(request: DownloadRequest): Promise<{
    jobId: string;
    status: string;
    message: string;
  }> {
    return this.directRequest('/downloads', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getDownloadStatus(jobId: string): Promise<DownloadJob> {
    return this.directRequest(`/downloads/${jobId}`);
  }

  async getDownloadQueue(): Promise<DownloadQueue> {
    return this.directRequest('/downloads');
  }

  async cancelDownload(jobId: string): Promise<{ message: string }> {
    return this.directRequest(`/downloads/${jobId}`, {
      method: 'DELETE',
    });
  }

  async clearCompletedDownloads(): Promise<{ message: string }> {
    return this.directRequest('/downloads/clear', {
      method: 'POST',
    });
  }

  // File Upload API
  async uploadVideo(
    file: File,
    category: string = 'family'
  ): Promise<{
    message: string;
    video: Partial<Video>;
  }> {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('category', category);

    return this.directRequest('/videos/upload', {
      method: 'POST',
      headers: {}, // Remove Content-Type for FormData
      body: formData,
    });
  }

  // Admin API
  async getSystemStatus(): Promise<SystemStatus> {
    return this.directRequest('/admin/status');
  }

  // Polling utilities for download progress
  startPollingDownload(
    jobId: string,
    onUpdate: (job: DownloadJob) => void,
    onComplete: (job: DownloadJob) => void,
    onError: (error: Error) => void,
    intervalMs: number = 2000
  ): () => void {
    let isPolling = true;

    const poll = async () => {
      if (!isPolling) return;

      try {
        const job = await this.getDownloadStatus(jobId);
        onUpdate(job);

        if (job.status === 'completed') {
          isPolling = false;
          onComplete(job);
        } else if (job.status === 'failed' || job.status === 'cancelled') {
          isPolling = false;
          onError(new Error(job.error || `Download ${job.status}`));
        } else {
          setTimeout(poll, intervalMs);
        }
      } catch (error) {
        isPolling = false;
        onError(error as Error);
      }
    };

    poll();

    // Return cleanup function
    return () => {
      isPolling = false;
    };
  }
}

export const api = new ApiService();
export default api;
