'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient, formatApiError } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  status: string;
  amount: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd: string | null;
  cancelledAt: string | null;
  invoices: Invoice[];
}

interface Invoice {
  id: string;
  number: string | null;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  TRIALING: 'bg-blue-100 text-blue-800',
  PAST_DUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  UNPAID: 'bg-orange-100 text-orange-800',
  INCOMPLETE: 'bg-yellow-100 text-yellow-800',
  PAUSED: 'bg-purple-100 text-purple-800',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(dateStr));
}

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => apiClient.get<Subscription>('/subscriptions'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiClient.delete('/subscriptions'),
    onSuccess: () => {
      toast.success('Subscription cancelled. Access continues until the end of your billing period.');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setConfirmCancel(false);
    },
    onError: (err) => toast.error(formatApiError(err)),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => apiClient.post('/subscriptions/reactivate'),
    onSuccess: () => {
      toast.success('Subscription reactivated!');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: (err) => toast.error(formatApiError(err)),
  });

  const portalMutation = useMutation({
    mutationFn: () => apiClient.post<{ url: string }>('/subscriptions/billing-portal'),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err) => toast.error(formatApiError(err)),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your subscription and invoices</p>
        </div>
        <Card className="p-8 text-center">
          <div className="text-4xl mb-4">💳</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Subscription</h2>
          <p className="text-gray-500 mb-6">Subscribe to TapFlow to start accepting payments.</p>
          <Button onClick={() => (window.location.href = '/onboarding?step=9')} size="lg">
            Subscribe — $25/month
          </Button>
        </Card>
      </div>
    );
  }

  const isCancelled = subscription.status === 'CANCELLED';
  const isTrialing = subscription.status === 'TRIALING';
  const isPastDue = subscription.status === 'PAST_DUE';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your subscription and invoices</p>
      </div>

      {/* Current plan */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">TapFlow Pro</h2>
            <p className="text-gray-500 text-sm">Everything you need to run your business</p>
          </div>
          <Badge className={STATUS_COLORS[subscription.status] || 'bg-gray-100 text-gray-700'}>
            {subscription.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-y border-gray-100 mb-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Monthly Cost</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {formatMoney(subscription.amount)}
            </div>
            <div className="text-xs text-gray-500">+ 1% transaction fee</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Current Period</div>
            <div className="text-sm font-medium text-gray-900 mt-1">
              {formatDate(subscription.currentPeriodStart)} →
            </div>
            <div className="text-sm text-gray-600">{formatDate(subscription.currentPeriodEnd)}</div>
          </div>
          {isTrialing && subscription.trialEnd && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Trial Ends</div>
              <div className="text-sm font-semibold text-blue-700 mt-1">
                {formatDate(subscription.trialEnd)}
              </div>
              <div className="text-xs text-gray-500">Free until then</div>
            </div>
          )}
          {isCancelled && subscription.cancelledAt && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Cancelled</div>
              <div className="text-sm font-medium text-red-600 mt-1">
                {formatDate(subscription.cancelledAt)}
              </div>
            </div>
          )}
        </div>

        {/* Alerts */}
        {isPastDue && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            ⚠️ Your payment failed. Please update your payment method to keep your account active.
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => portalMutation.mutate()}
            loading={portalMutation.isPending}
          >
            Manage via Stripe
          </Button>

          {isCancelled && (
            <Button
              variant="success"
              onClick={() => reactivateMutation.mutate()}
              loading={reactivateMutation.isPending}
            >
              Reactivate Subscription
            </Button>
          )}

          {!isCancelled && !confirmCancel && (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setConfirmCancel(true)}
            >
              Cancel Subscription
            </Button>
          )}

          {confirmCancel && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Are you sure?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => cancelMutation.mutate()}
                loading={cancelMutation.isPending}
              >
                Yes, Cancel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmCancel(false)}
              >
                No, keep it
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Invoices */}
      {subscription.invoices && subscription.invoices.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Billing History</h2>
          <div className="space-y-2">
            {subscription.invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {invoice.number || `INV-${invoice.id.slice(0, 8)}`}
                  </div>
                  <div className="text-xs text-gray-500">{formatDate(invoice.createdAt)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatMoney(invoice.amount)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    invoice.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {invoice.status}
                  </span>
                  {invoice.invoicePdf && (
                    <a
                      href={invoice.invoicePdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      PDF
                    </a>
                  )}
                  {invoice.hostedInvoiceUrl && (
                    <a
                      href={invoice.hostedInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Platform fee info */}
      <Card className="p-6 bg-gray-50 border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Platform Fee Structure</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Monthly subscription</span>
            <span className="font-medium">$25/month</span>
          </div>
          <div className="flex justify-between">
            <span>Platform fee on transactions</span>
            <span className="font-medium">1%</span>
          </div>
          <div className="flex justify-between">
            <span>Stripe processing fees</span>
            <span className="font-medium">Per Stripe pricing</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Platform fees are automatically deducted from each transaction. You receive the net amount directly.
        </p>
      </Card>
    </div>
  );
}
