'use client';

import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  ShoppingCart,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { formatMoney, formatRelativeTime } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import Link from 'next/link';

interface DashboardMetrics {
  today: {
    revenue: number;
    tips: number;
    orders: number;
    averageOrderValue: number;
  };
  thisMonth: { revenue: number; orders: number };
  lastMonth: { revenue: number; orders: number };
  topProducts: Array<{ name: string; _sum: { totalAmount: number; quantity: number } }>;
  lowStock: Array<{ product: { name: string }; location: { name: string }; quantity: number }>;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'primary',
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`rounded-xl p-3 bg-primary/10`}>
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>

        {trend && trendValue && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {trend === 'up' ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
            )}
            <span className={trend === 'up' ? 'text-emerald-600' : 'text-red-600'}>
              {trendValue}
            </span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => apiClient.get<DashboardMetrics>('/reports/dashboard'),
    refetchInterval: 60000,
  });

  const revenueGrowth = metrics
    ? metrics.lastMonth.revenue > 0
      ? (((metrics.thisMonth.revenue - metrics.lastMonth.revenue) / metrics.lastMonth.revenue) * 100).toFixed(1)
      : null
    : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse bg-muted rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link href="/pos">
          <Button size="lg" className="gap-2 shadow-md">
            <Zap className="h-4 w-4" />
            Open POS
          </Button>
        </Link>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Revenue"
          value={formatMoney(metrics?.today.revenue || 0)}
          subtitle={`${metrics?.today.orders || 0} orders`}
          icon={DollarSign}
          trend={revenueGrowth ? (parseFloat(revenueGrowth) >= 0 ? 'up' : 'down') : undefined}
          trendValue={revenueGrowth ? `${Math.abs(parseFloat(revenueGrowth))}%` : undefined}
        />
        <MetricCard
          title="Transactions Today"
          value={String(metrics?.today.orders || 0)}
          subtitle={`AOV: ${formatMoney(metrics?.today.averageOrderValue || 0)}`}
          icon={ShoppingCart}
        />
        <MetricCard
          title="Tips Today"
          value={formatMoney(metrics?.today.tips || 0)}
          icon={TrendingUp}
        />
        <MetricCard
          title="Monthly Revenue"
          value={formatMoney(metrics?.thisMonth.revenue || 0)}
          subtitle={`${metrics?.thisMonth.orders || 0} orders`}
          icon={DollarSign}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Products This Month</CardTitle>
            <CardDescription>By revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics?.topProducts && metrics.topProducts.length > 0 ? (
              <div className="space-y-3">
                {metrics.topProducts.map((product, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product._sum.quantity} sold
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{formatMoney(product._sum.totalAmount)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No sales data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Low Stock</CardTitle>
              {(metrics?.lowStock?.length || 0) > 0 && (
                <Badge variant="warning">{metrics?.lowStock.length}</Badge>
              )}
            </div>
            <CardDescription>Items needing attention</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics?.lowStock && metrics.lowStock.length > 0 ? (
              <div className="space-y-3">
                {metrics.lowStock.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">{item.location.name}</p>
                    </div>
                    <Badge variant={item.quantity === 0 ? 'destructive' : 'warning'}>
                      {item.quantity}
                    </Badge>
                  </div>
                ))}
                <Link href="/dashboard/inventory">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Manage inventory
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">All stock levels are healthy</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'New Sale', href: '/pos', icon: Zap },
              { label: 'Add Product', href: '/dashboard/products/new', icon: Package },
              { label: 'View Orders', href: '/dashboard/orders', icon: ShoppingCart },
              { label: 'Customer CRM', href: '/dashboard/customers', icon: Users },
            ].map((action) => (
              <Link key={action.label} href={action.href}>
                <Button variant="outline" className="w-full h-16 flex-col gap-2" size="sm">
                  <action.icon className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
