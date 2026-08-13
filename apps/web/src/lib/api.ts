import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token and merchant ID
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const merchantId = localStorage.getItem('currentMerchantId');
    if (merchantId) {
      config.headers['X-Merchant-ID'] = merchantId;
    }
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await api.post('/auth/refresh');
        const { accessToken } = response.data.data;

        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
        }

        processQueue(null, accessToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('currentMerchantId');
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    api.get<{ success: boolean; data: T }>(url, config).then((r) => r.data.data),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.post<{ success: boolean; data: T }>(url, data, config).then((r) => r.data.data),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.put<{ success: boolean; data: T }>(url, data, config).then((r) => r.data.data),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.patch<{ success: boolean; data: T }>(url, data, config).then((r) => r.data.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    api.delete<{ success: boolean; data: T }>(url, config).then((r) => r.data.data),
};

export function formatApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || error.message || 'An error occurred';
  }
  return 'An unexpected error occurred';
}
