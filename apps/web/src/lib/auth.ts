import { apiClient, api } from './api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  status: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  avatarUrl?: string;
  currentMerchantId?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  merchantId: string | null;
  isAuthenticated: boolean;
}

export async function login(email: string, password: string, mfaCode?: string) {
  const response = await api.post('/auth/login', { email, password, mfaCode });
  const data = response.data;

  if (data.data?.requiresMfa) {
    return { requiresMfa: true, userId: data.data.userId };
  }

  const { accessToken, user, merchant } = data.data || data;

  if (accessToken) {
    localStorage.setItem('accessToken', accessToken);
  }

  if (merchant?.id) {
    localStorage.setItem('currentMerchantId', merchant.id);
  }

  return { user, merchant, accessToken };
}

export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}) {
  return api.post('/auth/register', data).then((r) => r.data);
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentMerchantId');
  }
}

export async function getMe(): Promise<User> {
  return apiClient.get<User>('/auth/me');
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function getStoredMerchantId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('currentMerchantId');
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}
