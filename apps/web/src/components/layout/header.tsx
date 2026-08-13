'use client';

import { Bell, Search, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/hooks/useAuth';
import { getInitials } from '@/lib/utils';

export function DashboardHeader() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();

  return (
    <header className="flex items-center justify-between border-b bg-card px-6 py-3 flex-shrink-0">
      <div className="w-72">
        <Input
          placeholder="Search orders, products, customers..."
          leftIcon={<Search className="h-4 w-4" />}
          className="h-9 bg-background"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="text-muted-foreground"
        >
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </Button>

        <Button variant="ghost" size="icon" className="text-muted-foreground relative">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold cursor-pointer">
          {getInitials(user?.firstName, user?.lastName)}
        </div>
      </div>
    </header>
  );
}
