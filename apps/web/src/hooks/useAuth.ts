'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getMe, login as apiLogin, logout as apiLogout, User } from '@/lib/auth';

interface AuthStore {
  user: User | null;
  merchantId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string, mfaCode?: string) => Promise<{ requiresMfa?: boolean }>;
  logout: () => Promise<void>;
  setMerchantId: (id: string) => void;
  loadUser: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      merchantId: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email, password, mfaCode) => {
        set({ isLoading: true });
        try {
          const result = await apiLogin(email, password, mfaCode);

          if (result.requiresMfa) {
            return { requiresMfa: true };
          }

          const { user, merchant, accessToken } = result as { user: User; merchant: { id: string } | null; accessToken: string };

          if (accessToken) {
            localStorage.setItem('accessToken', accessToken);
          }

          const merchantId = merchant?.id || null;
          if (merchantId) {
            localStorage.setItem('currentMerchantId', merchantId);
          }

          set({ user, merchantId, isAuthenticated: true, isLoading: false });
          return {};
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await apiLogout();
        } finally {
          set({ user: null, merchantId: null, isAuthenticated: false, isLoading: false });
        }
      },

      setMerchantId: (id) => {
        localStorage.setItem('currentMerchantId', id);
        set({ merchantId: id });
      },

      loadUser: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await getMe();
          const merchantId = localStorage.getItem('currentMerchantId');
          set({ user, merchantId, isAuthenticated: true, isLoading: false });
        } catch {
          localStorage.removeItem('accessToken');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'tapflow-auth',
      partialize: (state) => ({ merchantId: state.merchantId }),
    },
  ),
);

export function useAuth() {
  return useAuthStore();
}
