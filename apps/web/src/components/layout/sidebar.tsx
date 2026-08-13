'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap, LayoutDashboard, ShoppingCart, Package, Users, BarChart3,
  Settings, LogOut, MapPin, UserCheck, Cpu, BookOpen, CreditCard,
  ChevronLeft, ChevronRight, Layers, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'POS', href: '/pos', icon: Zap, highlight: true },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Layers },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Employees', href: '/dashboard/employees', icon: UserCheck },
  { name: 'Locations', href: '/dashboard/locations', icon: MapPin },
  { name: 'Devices', href: '/dashboard/devices', icon: Cpu },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    router.push('/auth/login');
  };

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-2 p-4 border-b', collapsed && 'justify-center')}>
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm">
          <Zap className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight">TapFlow</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                    : 'text-muted-foreground',
                  item.highlight && !isActive && 'text-primary',
                  collapsed && 'justify-center px-2',
                )}
              >
                <item.icon className={cn('h-4.5 w-4.5 flex-shrink-0', item.highlight && 'h-5 w-5')} />
                {!collapsed && (
                  <span className={item.highlight ? 'font-semibold' : ''}>{item.name}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t p-2">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className={cn('text-muted-foreground hover:text-destructive', !collapsed && 'w-full justify-start gap-3 px-3')}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && 'Sign out'}
        </Button>
      </div>

      {/* Collapse toggle */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-sm hover:bg-accent"
        onClick={() => setCollapsed((c) => !c)}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>
    </aside>
  );
}
