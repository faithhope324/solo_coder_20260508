import axios, { AxiosInstance } from 'axios';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt?: string;
}

export interface Domain {
  id: number;
  domain: string;
  status: string;
  provider: string;
  cname: string;
  region: string;
  createdAt: string;
}

export type TaskType = 'preheat' | 'refresh';
export type TaskStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface Task {
  id: number;
  urls: string[];
  type: TaskType;
  status: TaskStatus;
  progress: number;
  totalCount: number;
  successCount: number;
  failCount: number;
  errorMessage?: string;
  domain: Domain;
  createdAt: string;
  completedAt?: string;
}

export interface TaskListResponse {
  list: Task[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CdnOverview {
  domain: string;
  currentHitRate: number;
  currentBandwidth: number;
  todayRequestCount: number;
  todayFlow: number;
  activeStatus: string;
}

export interface HourlyStats {
  time: string;
  hitRate: number;
  bandwidth: number;
}

export interface TaskStatsSummary {
  pending: number;
  processing: number;
  success: number;
  failed: number;
  today: number;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    return this.client.post('/auth/login', { username, password });
  }

  async register(username: string, email: string, password: string): Promise<{ token: string; user: User }> {
    return this.client.post('/auth/register', { username, email, password });
  }

  async getCurrentUser(): Promise<User> {
    return this.client.get('/auth/me');
  }

  async getDomains(): Promise<Domain[]> {
    return this.client.get('/domains');
  }

  async addDomain(domain: string, provider: string, region: string): Promise<Domain> {
    return this.client.post('/domains', { domain, provider, region });
  }

  async updateDomain(id: number, provider: string, region: string): Promise<Domain> {
    return this.client.put(`/domains/${id}`, { provider, region });
  }

  async deleteDomain(id: number): Promise<void> {
    return this.client.delete(`/domains/${id}`);
  }

  async getCdnOverview(domainId: number): Promise<CdnOverview> {
    return this.client.get(`/cdn/overview/${domainId}`);
  }

  async getCdnStats(domainId: number, hours?: number): Promise<HourlyStats[]> {
    const params = hours ? { hours } : {};
    return this.client.get(`/cdn/stats/${domainId}`, { params });
  }

  async submitPreheat(domainId: number, urls: string[]): Promise<{ taskId: number; message: string }> {
    return this.client.post('/cdn/preheat', { domainId, urls });
  }

  async submitRefresh(domainId: number, urls: string[], type?: string): Promise<{ taskId: number; message: string }> {
    return this.client.post('/cdn/refresh', { domainId, urls, type });
  }

  async getTasks(params?: {
    page?: number;
    pageSize?: number;
    type?: TaskType;
    status?: TaskStatus;
  }): Promise<TaskListResponse> {
    return this.client.get('/tasks', { params });
  }

  async getTask(id: number): Promise<Task> {
    return this.client.get(`/tasks/${id}`);
  }

  async getTaskStatsSummary(): Promise<TaskStatsSummary> {
    return this.client.get('/tasks/stats/summary');
  }
}

export const api = new ApiClient();
