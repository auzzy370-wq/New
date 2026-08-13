'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient, formatApiError } from '@/lib/api';
import { useAuthStore } from '@/hooks/useAuth';
import { toast } from 'sonner';
import Link from 'next/link';

interface MerchantData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  website: string | null;
  description: string | null;
  businessType: string | null;
  taxId: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  timezone: string;
  currency: string;
  status: string;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  subscriptionStatus: string | null;
  platformFeeRate: number;
  settings: {
    emailReceiptsEnabled: boolean;
    smsReceiptsEnabled: boolean;
    tipsEnabled: boolean;
    tipPresets: number[];
    taxIncluded: boolean;
    receiptHeader: string | null;
    receiptFooter: string | null;
    trackInventory: boolean;
    lowStockThreshold: number;
    allowCashPayments: boolean;
  } | null;
}

function SettingsSection({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {description && <div className="text-xs text-gray-500">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { merchantId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'business' | 'payments' | 'receipts' | 'stripe'>('business');

  const { data: merchant, isLoading } = useQuery({
    queryKey: ['merchant', merchantId],
    queryFn: () => apiClient.get<MerchantData>(`/merchants/${merchantId}`),
    enabled: !!merchantId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.put(`/merchants/${merchantId}`, data),
    onSuccess: () => {
      toast.success('Settings saved');
      queryClient.invalidateQueries({ queryKey: ['merchant', merchantId] });
    },
    onError: (err) => toast.error(formatApiError(err)),
  });

  const stripeMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ url: string }>(`/merchants/${merchantId}/stripe/dashboard`),
    onSuccess: (data) => { window.location.href = data.url; },
    onError: (err) => toast.error(formatApiError(err)),
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ url: string }>('/subscriptions/billing-portal'),
    onSuccess: (data) => { window.location.href = data.url; },
    onError: (err) => toast.error(formatApiError(err)),
  });

  if (isLoading || !merchant) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  const TABS = [
    { key: 'business', label: 'Business' },
    { key: 'payments', label: 'Payments' },
    { key: 'receipts', label: 'Receipts' },
    { key: 'stripe', label: 'Stripe Connect' },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your business settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Business Info */}
      {activeTab === 'business' && (
        <BusinessSettingsForm merchant={merchant} onSave={(data) => updateMutation.mutate(data)} loading={updateMutation.isPending} />
      )}

      {/* Payment settings */}
      {activeTab === 'payments' && (
        <PaymentSettings
          settings={merchant.settings}
          onSave={(data) => updateMutation.mutate(data)}
          loading={updateMutation.isPending}
        />
      )}

      {/* Receipt settings */}
      {activeTab === 'receipts' && (
        <ReceiptSettings
          settings={merchant.settings}
          onSave={(data) => updateMutation.mutate(data)}
          loading={updateMutation.isPending}
        />
      )}

      {/* Stripe Connect */}
      {activeTab === 'stripe' && (
        <StripeConnectSettings
          merchant={merchant}
          onOpenDashboard={() => stripeMutation.mutate()}
          onOpenPortal={() => portalMutation.mutate()}
          stripeLoading={stripeMutation.isPending}
          portalLoading={portalMutation.isPending}
        />
      )}
    </div>
  );
}

function BusinessSettingsForm({
  merchant,
  onSave,
  loading,
}: {
  merchant: MerchantData;
  onSave: (data: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    name: merchant.name || '',
    email: merchant.email || '',
    phone: merchant.phone || '',
    website: merchant.website || '',
    description: merchant.description || '',
    taxId: merchant.taxId || '',
    addressLine1: merchant.addressLine1 || '',
    city: merchant.city || '',
    state: merchant.state || '',
    postalCode: merchant.postalCode || '',
    country: merchant.country || 'US',
    timezone: merchant.timezone || 'America/New_York',
    currency: merchant.currency || 'usd',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <SettingsSection title="Business Information" description="Your public business details">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Business Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Business Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Website</label>
            <Input
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="mt-1"
              placeholder="https://"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Business Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">EIN / Tax ID</label>
          <Input
            value={form.taxId}
            onChange={(e) => setForm({ ...form, taxId: e.target.value })}
            className="mt-1"
            placeholder="XX-XXXXXXX"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Street Address</label>
          <Input
            value={form.addressLine1}
            onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700">City</label>
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">State</label>
            <Input
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              maxLength={2}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">ZIP Code</label>
            <Input
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Currency</label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="usd">USD — US Dollar</option>
              <option value="cad">CAD — Canadian Dollar</option>
              <option value="gbp">GBP — British Pound</option>
              <option value="eur">EUR — Euro</option>
              <option value="aud">AUD — Australian Dollar</option>
            </select>
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" loading={loading}>Save Changes</Button>
        </div>
      </form>
    </SettingsSection>
  );
}

function PaymentSettings({
  settings,
  onSave,
  loading,
}: {
  settings: MerchantData['settings'];
  onSave: (data: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [tipsEnabled, setTipsEnabled] = useState(settings?.tipsEnabled ?? true);
  const [allowCash, setAllowCash] = useState(settings?.allowCashPayments ?? true);
  const [taxIncluded, setTaxIncluded] = useState(settings?.taxIncluded ?? false);
  const [tipPresets, setTipPresets] = useState(
    (settings?.tipPresets || [15, 18, 20, 25]).join(', ')
  );

  function handleSave() {
    onSave({
      settings: {
        tipsEnabled,
        allowCashPayments: allowCash,
        taxIncluded,
        tipPresets: tipPresets.split(',').map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v)),
      },
    });
  }

  return (
    <SettingsSection title="Payment Settings" description="Configure how payments are processed">
      <div>
        <Toggle checked={tipsEnabled} onChange={setTipsEnabled} label="Enable Tips" description="Show tip prompt during checkout" />
        <Toggle checked={allowCash} onChange={setAllowCash} label="Accept Cash Payments" description="Allow cash as a payment method at POS" />
        <Toggle checked={taxIncluded} onChange={setTaxIncluded} label="Tax Included in Prices" description="Product prices already include tax" />
      </div>

      {tipsEnabled && (
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700">Tip Preset Percentages</label>
          <Input
            value={tipPresets}
            onChange={(e) => setTipPresets(e.target.value)}
            placeholder="15, 18, 20, 25"
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">Comma-separated percentages shown on tip screen</p>
        </div>
      )}

      <div className="mt-4">
        <Button onClick={handleSave} loading={loading}>Save Payment Settings</Button>
      </div>
    </SettingsSection>
  );
}

function ReceiptSettings({
  settings,
  onSave,
  loading,
}: {
  settings: MerchantData['settings'];
  onSave: (data: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [emailReceipts, setEmailReceipts] = useState(settings?.emailReceiptsEnabled ?? true);
  const [smsReceipts, setSmsReceipts] = useState(settings?.smsReceiptsEnabled ?? false);
  const [receiptHeader, setReceiptHeader] = useState(settings?.receiptHeader || '');
  const [receiptFooter, setReceiptFooter] = useState(settings?.receiptFooter || '');

  function handleSave() {
    onSave({
      settings: {
        emailReceiptsEnabled: emailReceipts,
        smsReceiptsEnabled: smsReceipts,
        receiptHeader,
        receiptFooter,
      },
    });
  }

  return (
    <SettingsSection title="Receipt Settings" description="Customize how receipts are sent to customers">
      <div className="mb-4">
        <Toggle checked={emailReceipts} onChange={setEmailReceipts} label="Email Receipts" description="Send receipts via email automatically" />
        <Toggle checked={smsReceipts} onChange={setSmsReceipts} label="SMS Receipts" description="Send receipts via text message (carrier rates may apply)" />
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Receipt Header</label>
          <textarea
            value={receiptHeader}
            onChange={(e) => setReceiptHeader(e.target.value)}
            placeholder="Thank you for shopping with us!"
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={2}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Receipt Footer</label>
          <textarea
            value={receiptFooter}
            onChange={(e) => setReceiptFooter(e.target.value)}
            placeholder="Please come again. No refunds after 30 days."
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={2}
          />
        </div>
      </div>

      <div className="mt-4">
        <Button onClick={handleSave} loading={loading}>Save Receipt Settings</Button>
      </div>
    </SettingsSection>
  );
}

function StripeConnectSettings({
  merchant,
  onOpenDashboard,
  onOpenPortal,
  stripeLoading,
  portalLoading,
}: {
  merchant: MerchantData;
  onOpenDashboard: () => void;
  onOpenPortal: () => void;
  stripeLoading: boolean;
  portalLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      <SettingsSection title="Stripe Connect" description="Your payment processing account">
        <div className="space-y-3">
          <StatusItem
            label="Account Connected"
            value={merchant.stripeAccountId ? `...${merchant.stripeAccountId.slice(-6)}` : 'Not connected'}
            status={!!merchant.stripeAccountId ? 'success' : 'error'}
          />
          <StatusItem
            label="Identity Verified"
            value={merchant.stripeOnboardingComplete ? 'Complete' : 'Pending'}
            status={merchant.stripeOnboardingComplete ? 'success' : 'warning'}
          />
          <StatusItem
            label="Charges Enabled"
            value={merchant.stripeChargesEnabled ? 'Yes' : 'No'}
            status={merchant.stripeChargesEnabled ? 'success' : 'error'}
          />
          <StatusItem
            label="Payouts Enabled"
            value={merchant.stripePayoutsEnabled ? 'Yes' : 'No'}
            status={merchant.stripePayoutsEnabled ? 'success' : 'warning'}
          />
        </div>

        <div className="mt-4 flex gap-3">
          {merchant.stripeAccountId && (
            <Button onClick={onOpenDashboard} loading={stripeLoading} variant="outline">
              Open Stripe Dashboard
            </Button>
          )}
          {!merchant.stripeOnboardingComplete && (
            <Link href="/onboarding?step=6">
              <Button>Complete Verification</Button>
            </Link>
          )}
        </div>
      </SettingsSection>

      <SettingsSection title="Subscription" description="Your TapFlow billing">
        <StatusItem
          label="Subscription Status"
          value={merchant.subscriptionStatus || 'None'}
          status={
            merchant.subscriptionStatus === 'ACTIVE' || merchant.subscriptionStatus === 'TRIALING'
              ? 'success'
              : merchant.subscriptionStatus === 'PAST_DUE'
              ? 'error'
              : 'warning'
          }
        />
        <div className="mt-4 flex gap-3">
          <Link href="/dashboard/billing">
            <Button variant="outline">Manage Billing</Button>
          </Link>
          <Button onClick={onOpenPortal} loading={portalLoading} variant="outline">
            Stripe Billing Portal
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}

function StatusItem({ label, value, status }: {
  label: string;
  value: string;
  status: 'success' | 'error' | 'warning';
}) {
  const colors = {
    success: 'text-emerald-700 bg-emerald-50',
    error: 'text-red-700 bg-red-50',
    warning: 'text-amber-700 bg-amber-50',
  };

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status]}`}>
        {value}
      </span>
    </div>
  );
}
