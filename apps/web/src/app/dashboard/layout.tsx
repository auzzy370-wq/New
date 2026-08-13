'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';
import { DashboardSidebar } from '@/components/layout/sidebar';
import { DashboardHeader } from '@/components/layout/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loadUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    loadUser().then(() => {
      if (!useAuthStore.getState().isAuthenticated) {
        router.push('/auth/login');
      }
    });
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <DashboardSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
