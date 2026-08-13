'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { onboardingApi, ONBOARDING_STEPS, OnboardingStatus } from '@/lib/onboarding';
import { useAuthStore } from '@/hooks/useAuth';
import { formatApiError } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Step Components ────────────────────────────────────────────────────────

function StepBusinessInfo({ onNext }: { onNext: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', website: '', description: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Business name is required'); return; }
    setLoading(true);
    try {
      await onboardingApi.updateBusinessInfo(form);
      onNext();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">Business Name *</label>
        <Input
          placeholder="e.g. Main Street Coffee"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Business Email</label>
        <Input
          type="email"
          placeholder="hello@yourbusiness.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Phone Number</label>
        <Input
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Website</label>
        <Input
          placeholder="https://yourbusiness.com"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Business Description</label>
        <textarea
          placeholder="Brief description of your business..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </div>
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Continue
      </Button>
    </form>
  );
}

function StepBusinessType({ onNext }: { onNext: () => void }) {
  const [businessType, setBusinessType] = useState('');
  const [taxId, setTaxId] = useState('');
  const [loading, setLoading] = useState(false);

  const types = [
    { value: 'individual', label: 'Individual / Sole Proprietor', desc: 'One owner, no separate legal entity' },
    { value: 'company', label: 'Company / Corporation', desc: 'LLC, S-Corp, C-Corp, or Partnership' },
    { value: 'non_profit', label: 'Non-Profit', desc: 'Tax-exempt non-profit organization' },
  ];

  async function handleSubmit() {
    if (!businessType) { toast.error('Please select a business type'); return; }
    setLoading(true);
    try {
      await onboardingApi.updateBusinessType({ businessType, taxId });
      onNext();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {types.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setBusinessType(t.value)}
            className={cn(
              'w-full rounded-xl border-2 p-4 text-left transition-all',
              businessType === t.value
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300',
            )}
          >
            <div className="font-semibold text-gray-900">{t.label}</div>
            <div className="text-sm text-gray-500 mt-0.5">{t.desc}</div>
          </button>
        ))}
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">EIN / Tax ID (optional)</label>
        <Input
          placeholder="XX-XXXXXXX"
          value={taxId}
          onChange={(e) => setTaxId(e.target.value)}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your EIN or SSN is used for tax reporting purposes only.
        </p>
      </div>
      <Button onClick={handleSubmit} className="w-full" size="lg" loading={loading} disabled={!businessType}>
        Continue
      </Button>
    </div>
  );
}

function StepBusinessAddress({ onNext }: { onNext: () => void }) {
  const [form, setForm] = useState({
    addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'US',
  });
  const [loading, setLoading] = useState(false);

  const US_STATES = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
    'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
    'VA','WA','WV','WI','WY','DC',
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onboardingApi.updateBusinessAddress(form);
      onNext();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">Street Address *</label>
        <Input
          placeholder="123 Main Street"
          value={form.addressLine1}
          onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
          className="mt-1"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Suite / Unit</label>
        <Input
          placeholder="Suite 100"
          value={form.addressLine2}
          onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700">City *</label>
          <Input
            placeholder="San Francisco"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="mt-1"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">State *</label>
          <select
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="">Select state</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">ZIP Code *</label>
        <Input
          placeholder="94102"
          value={form.postalCode}
          onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
          className="mt-1"
          required
        />
      </div>
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Continue
      </Button>
    </form>
  );
}

function StepOwnerInfo({ onNext }: { onNext: () => void }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', title: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onboardingApi.updateOwnerInfo(form);
      onNext();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700">First Name *</label>
          <Input
            placeholder="Jane"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className="mt-1"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Last Name *</label>
          <Input
            placeholder="Smith"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className="mt-1"
            required
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Phone Number</label>
        <Input
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Title / Role</label>
        <Input
          placeholder="Owner, CEO, Manager..."
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="mt-1"
        />
      </div>
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Continue
      </Button>
    </form>
  );
}

function StepStripeConnect({ onNext, onboardingStatus }: { onNext: () => void; onboardingStatus: OnboardingStatus | null }) {
  const [loading, setLoading] = useState(false);

  const isConnected = onboardingStatus?.merchant?.stripeChargesEnabled;
  const hasAccount = !!onboardingStatus?.merchant?.stripeAccountId;

  async function handleConnect() {
    setLoading(true);
    try {
      const result = await onboardingApi.initiateStripeConnect();
      window.location.href = result.url;
    } catch (err) {
      toast.error(formatApiError(err));
      setLoading(false);
    }
  }

  if (isConnected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-2xl">✅</div>
          <div>
            <div className="font-semibold text-emerald-800">Stripe Connected</div>
            <div className="text-sm text-emerald-700">Your payment account is active and ready to accept payments.</div>
          </div>
        </div>
        <Button onClick={onNext} className="w-full" size="lg">
          Continue to Subscription
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Powered by Stripe Connect</h3>
        <p className="text-sm text-blue-800">
          TapFlow uses Stripe to securely process payments. You&apos;ll need to complete
          Stripe&apos;s verification process to accept card payments.
        </p>
      </div>

      <div className="space-y-3">
        {[
          { icon: '🏦', title: 'Bank account for payouts', desc: 'Receive funds directly to your bank' },
          { icon: '🆔', title: 'Identity verification', desc: 'Required by financial regulations' },
          { icon: '🔒', title: 'Secure & compliant', desc: 'Stripe handles all PCI compliance' },
        ].map((item) => (
          <div key={item.title} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <span className="text-xl">{item.icon}</span>
            <div>
              <div className="text-sm font-medium text-gray-900">{item.title}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Button onClick={handleConnect} className="w-full" size="lg" loading={loading}>
          {hasAccount ? 'Continue Stripe Onboarding' : 'Connect with Stripe'}
        </Button>
        <p className="text-center text-xs text-gray-500">
          You&apos;ll be redirected to Stripe to complete setup, then returned here.
        </p>
      </div>
    </div>
  );
}

function StepKycKyb({ onNext, onboardingStatus }: { onNext: () => void; onboardingStatus: OnboardingStatus | null }) {
  const isComplete = onboardingStatus?.merchant?.stripeOnboardingComplete;
  const chargesEnabled = onboardingStatus?.merchant?.stripeChargesEnabled;
  const payoutsEnabled = onboardingStatus?.merchant?.stripePayoutsEnabled;
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  async function checkStatus() {
    setChecking(true);
    try {
      await onboardingApi.handleStripeReturn();
      window.location.reload();
    } catch {
      // Ignore
    } finally {
      setChecking(false);
    }
  }

  async function handleContinue() {
    setLoading(true);
    try {
      const result = await onboardingApi.initiateStripeConnect();
      window.location.href = result.url;
    } catch (err) {
      toast.error(formatApiError(err));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <StatusRow label="Identity Verification" done={!!chargesEnabled} />
        <StatusRow label="Business Verification" done={!!isComplete} />
        <StatusRow label="Bank Account / Payouts" done={!!payoutsEnabled} />
      </div>

      {isComplete && payoutsEnabled ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="font-semibold text-emerald-800">Verification Complete!</div>
          <div className="text-sm text-emerald-700 mt-1">Your Stripe account is fully verified and active.</div>
        </div>
      ) : (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="font-semibold text-amber-800">Verification In Progress</div>
          <div className="text-sm text-amber-700 mt-1">
            Stripe may require additional information. Check your email or return to Stripe to complete verification.
          </div>
        </div>
      )}

      <div className="space-y-2">
        {!isComplete && (
          <Button onClick={handleContinue} className="w-full" size="lg" loading={loading} variant="outline">
            Continue Stripe Verification
          </Button>
        )}
        <Button onClick={checkStatus} variant="ghost" className="w-full" loading={checking}>
          Refresh Status
        </Button>
        <Button onClick={onNext} className="w-full" size="lg" disabled={!chargesEnabled}>
          Continue to Subscription
        </Button>
      </div>
    </div>
  );
}

function StatusRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={cn(
      'flex items-center justify-between rounded-lg p-3',
      done ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200',
    )}>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className={cn('text-sm font-semibold', done ? 'text-emerald-600' : 'text-gray-400')}>
        {done ? '✓ Complete' : 'Pending'}
      </span>
    </div>
  );
}

function StepBankSetup({ onNext, onboardingStatus }: { onNext: () => void; onboardingStatus: OnboardingStatus | null }) {
  const payoutsEnabled = onboardingStatus?.merchant?.stripePayoutsEnabled;
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setLoading(true);
    try {
      const result = await onboardingApi.initiateStripeConnect();
      window.location.href = result.url;
    } catch (err) {
      toast.error(formatApiError(err));
      setLoading(false);
    }
  }

  if (payoutsEnabled) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-2xl">🏦</div>
          <div>
            <div className="font-semibold text-emerald-800">Bank Account Connected</div>
            <div className="text-sm text-emerald-700">Payouts are enabled on your account.</div>
          </div>
        </div>
        <Button onClick={onNext} className="w-full" size="lg">
          Continue to Subscription
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Add your bank account</h3>
        <p className="text-sm text-blue-800">
          Stripe needs your bank account details to deposit your sales revenue.
          This is handled securely by Stripe — we never see your banking credentials.
        </p>
      </div>
      <Button onClick={handleContinue} className="w-full" size="lg" loading={loading}>
        Add Bank Account via Stripe
      </Button>
      <Button onClick={onNext} variant="ghost" className="w-full text-gray-500">
        Skip for now
      </Button>
    </div>
  );
}

function StepSubscription({ onNext, merchantId }: { onNext: () => void; merchantId: string }) {
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  async function handleStartTrial() {
    setLoading(true);
    try {
      const { data } = await fetch('/api/v1/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'X-Merchant-ID': merchantId,
        },
        body: JSON.stringify({ merchantName: '' }),
      }).then((r) => r.json());

      if (data?.id) {
        toast.success('14-day free trial started!');
        onNext();
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-white p-6">
        <div className="text-center mb-4">
          <div className="text-4xl font-bold text-gray-900">$25<span className="text-lg font-normal text-gray-500">/month</span></div>
          <div className="text-sm text-gray-500 mt-1">+ 1% platform fee on transactions</div>
        </div>

        <ul className="space-y-2 mb-6">
          {[
            'Unlimited products & categories',
            'Multi-location support',
            'Tap to Pay on iPhone & Android',
            'Full inventory management',
            'CRM & customer management',
            'Advanced reports & analytics',
            'Employee management',
            'Receipt delivery (email, SMS, QR)',
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-emerald-500 font-bold">✓</span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center text-sm text-blue-800 mb-4">
          🎉 <strong>14-day free trial</strong> — no credit card required to start
        </div>

        <Button onClick={handleStartTrial} className="w-full" size="lg" loading={loading}>
          Start Free Trial
        </Button>
      </div>
      <p className="text-center text-xs text-gray-500">
        Cancel anytime. Billed monthly after trial ends.
        Powered by Stripe Billing.
      </p>
    </div>
  );
}

function StepCreateLocation({ onNext, merchantId }: { onNext: () => void; merchantId: string }) {
  const [form, setForm] = useState({
    name: '', addressLine1: '', city: '', state: '', postalCode: '',
    phone: '', email: '', defaultTaxRate: '',
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Location name is required'); return; }
    setLoading(true);
    try {
      await onboardingApi.createLocation({
        ...form,
        defaultTaxRate: form.defaultTaxRate ? parseFloat(form.defaultTaxRate) : undefined,
      });
      toast.success('Location created!');
      onNext();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">Location Name *</label>
        <Input
          placeholder="e.g. Main Street, Downtown Store"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Address</label>
        <Input
          placeholder="123 Main Street"
          value={form.addressLine1}
          onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-700">City</label>
          <Input
            placeholder="San Francisco"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">State</label>
          <Input
            placeholder="CA"
            maxLength={2}
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
            className="mt-1"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700">ZIP Code</label>
          <Input
            placeholder="94102"
            value={form.postalCode}
            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Tax Rate (%)</label>
          <Input
            type="number"
            min="0"
            max="30"
            step="0.1"
            placeholder="8.5"
            value={form.defaultTaxRate}
            onChange={(e) => setForm({ ...form, defaultTaxRate: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Create Location
      </Button>
    </form>
  );
}

function StepProducts({ onNext }: { onNext: () => void }) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-800">
          Add your products so your staff can quickly find and add them to orders.
          You can also import products from a CSV file.
        </p>
      </div>
      <div className="space-y-3">
        <Button
          onClick={() => { router.push('/dashboard/products/new?onboarding=1'); }}
          className="w-full"
          size="lg"
        >
          Add First Product
        </Button>
        <Button onClick={onNext} variant="outline" className="w-full" size="lg">
          Skip for now
        </Button>
      </div>
    </div>
  );
}

function StepDevice({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {[
          { icon: '📱', title: 'Tap to Pay on iPhone', desc: 'Use your iPhone to accept contactless payments. Requires iOS 16+.' },
          { icon: '🤖', title: 'Tap to Pay on Android', desc: 'Use your Android device to accept NFC payments.' },
          { icon: '💳', title: 'Stripe Reader', desc: 'Connect a dedicated Stripe card reader for faster checkout.' },
        ].map((device) => (
          <div key={device.title} className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200">
            <span className="text-2xl">{device.icon}</span>
            <div>
              <div className="font-medium text-gray-900">{device.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{device.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        📱 Download the <strong>TapFlow POS</strong> app on your device to connect and start taking payments.
      </div>
      <Button onClick={onNext} className="w-full" size="lg">
        Continue
      </Button>
    </div>
  );
}

function StepTapToPay({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-5 text-center">
        <div className="text-4xl mb-3">⚡</div>
        <h3 className="text-lg font-bold text-indigo-900">Tap to Pay</h3>
        <p className="text-sm text-indigo-700 mt-2">
          Accept contactless payments directly on your iPhone or Android device.
          No extra hardware required.
        </p>
      </div>

      <div className="space-y-3">
        {[
          { icon: '📲', title: 'Download TapFlow POS', desc: 'Available on App Store and Google Play' },
          { icon: '🔑', title: 'Sign in to the app', desc: 'Use your TapFlow credentials' },
          { icon: '⚡', title: 'Enable Tap to Pay', desc: 'Follow in-app prompts to enable' },
          { icon: '💳', title: 'Start accepting payments', desc: 'Customer taps card or phone to pay' },
        ].map((step, i) => (
          <div key={step.title} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
              {i + 1}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{step.title}</div>
              <div className="text-xs text-gray-500">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onNext} className="w-full" size="lg">
        Got it, Continue
      </Button>
    </div>
  );
}

function StepTestTransaction({ onNext, merchantId }: { onNext: () => void; merchantId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/onboarding/test-transaction/complete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'X-Merchant-ID': merchantId,
        },
      });
      if (res.ok) {
        toast.success('Test transaction recorded!');
        onNext();
      }
    } catch {
      onNext();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 p-5">
        <h3 className="font-bold text-purple-900 mb-2">Run a test transaction</h3>
        <p className="text-sm text-purple-800">
          Use the Stripe test card <code className="bg-white px-1 rounded font-mono text-xs">4242 4242 4242 4242</code> with
          any future expiry and any 3-digit CVC to verify your setup works correctly.
        </p>
      </div>

      <div className="space-y-3">
        <div className="p-4 rounded-xl border-2 border-dashed border-gray-300 text-center">
          <div className="text-2xl mb-2">🧪</div>
          <div className="text-sm font-medium text-gray-700">Test in Sandbox Mode</div>
          <div className="text-xs text-gray-500 mt-1">No real money is charged during testing</div>
        </div>
      </div>

      <div className="space-y-2">
        <Button onClick={handleComplete} className="w-full" size="lg" loading={loading}>
          I&apos;ve Completed a Test Transaction
        </Button>
        <Button onClick={onNext} variant="ghost" className="w-full text-gray-500">
          Skip for now
        </Button>
      </div>
    </div>
  );
}

function StepComplete({ merchantId }: { merchantId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleFinish() {
    setLoading(true);
    try {
      await onboardingApi.completeOnboarding();
    } catch {
      // Non-blocking
    }
    router.push('/dashboard');
  }

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-5xl shadow-lg">
          🎉
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900">You&apos;re ready to sell!</h2>
        <p className="text-gray-600 mt-2">
          Your TapFlow account is fully set up. Start accepting payments right away.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '💳', label: 'Tap to Pay\nEnabled' },
          { icon: '📊', label: 'Dashboard\nReady' },
          { icon: '📦', label: 'Inventory\nTracked' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className="text-xs font-medium text-emerald-800 whitespace-pre-line">{item.label}</div>
          </div>
        ))}
      </div>

      <Button onClick={handleFinish} className="w-full" size="xl" loading={loading}>
        Go to Dashboard
      </Button>
    </div>
  );
}

// ─── Main Onboarding Page ────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { user, merchantId, isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await onboardingApi.getStatus();
      setStatus(s);
      setCurrentStep(s.nextStep);
    } catch {
      // Ignore errors during status fetch
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!merchantId) {
      router.push('/dashboard');
      return;
    }
    fetchStatus();
  }, [isAuthenticated, merchantId, router, fetchStatus]);

  // Handle Stripe return redirect
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('stripe') === 'return') {
      onboardingApi.handleStripeReturn().then(() => fetchStatus()).catch(() => {});
    }
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const stepInfo = ONBOARDING_STEPS.find((s) => s.step === currentStep) || ONBOARDING_STEPS[0];
  const progress = ((currentStep - 1) / 14) * 100;

  function goToNext() {
    const next = Math.min(currentStep + 1, 15);
    setCurrentStep(next);
    fetchStatus();
  }

  function renderStep() {
    switch (currentStep) {
      case 1: return <StepAccountCreated onNext={goToNext} />;
      case 2: return <StepBusinessInfo onNext={goToNext} />;
      case 3: return <StepBusinessType onNext={goToNext} />;
      case 4: return <StepBusinessAddress onNext={goToNext} />;
      case 5: return <StepOwnerInfo onNext={goToNext} />;
      case 6: return <StepStripeConnect onNext={goToNext} onboardingStatus={status} />;
      case 7: return <StepKycKyb onNext={goToNext} onboardingStatus={status} />;
      case 8: return <StepBankSetup onNext={goToNext} onboardingStatus={status} />;
      case 9: return <StepSubscription onNext={goToNext} merchantId={merchantId || ''} />;
      case 10: return <StepCreateLocation onNext={goToNext} merchantId={merchantId || ''} />;
      case 11: return <StepProducts onNext={goToNext} />;
      case 12: return <StepDevice onNext={goToNext} />;
      case 13: return <StepTapToPay onNext={goToNext} />;
      case 14: return <StepTestTransaction onNext={goToNext} merchantId={merchantId || ''} />;
      case 15: return <StepComplete merchantId={merchantId || ''} />;
      default: return <StepAccountCreated onNext={goToNext} />;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <span className="font-bold text-gray-900">TapFlow</span>
          </div>
          <div className="text-sm text-gray-500">
            Step {currentStep} of 15
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 pb-3">
          <Progress value={progress} />
        </div>
      </header>

      {/* Sidebar Steps (hidden on mobile, shown on md+) */}
      <div className="max-w-4xl mx-auto px-4 py-8 flex gap-8">
        {/* Step list */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-28 space-y-1">
            {ONBOARDING_STEPS.map((step) => {
              const isDone = status?.completedSteps.includes(step.step);
              const isCurrent = step.step === currentStep;

              return (
                <button
                  key={step.step}
                  onClick={() => {
                    if (isDone || step.step <= (status?.currentStep || 1)) {
                      setCurrentStep(step.step);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-left text-xs transition-colors',
                    isCurrent && 'bg-primary/10 text-primary font-semibold',
                    isDone && !isCurrent && 'text-emerald-600 hover:bg-emerald-50',
                    !isDone && !isCurrent && 'text-gray-400 cursor-default',
                  )}
                >
                  <span className={cn(
                    'h-5 w-5 rounded-full flex items-center justify-center text-xs flex-shrink-0',
                    isCurrent && 'bg-primary text-white',
                    isDone && !isCurrent && 'bg-emerald-100 text-emerald-600',
                    !isDone && !isCurrent && 'bg-gray-100 text-gray-400',
                  )}>
                    {isDone && !isCurrent ? '✓' : step.step}
                  </span>
                  {step.title}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <Card className="p-6 shadow-sm">
            <div className="mb-6">
              <div className="text-3xl mb-2">{stepInfo.icon}</div>
              <h1 className="text-xl font-bold text-gray-900">{stepInfo.title}</h1>
              <p className="text-gray-500 text-sm mt-1">{stepInfo.description}</p>
            </div>

            {renderStep()}
          </Card>
        </main>
      </div>
    </div>
  );
}

function StepAccountCreated({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
        <div className="text-2xl">✅</div>
        <div>
          <div className="font-semibold text-emerald-800">Account Created</div>
          <div className="text-sm text-emerald-700">Your TapFlow account is ready. Let&apos;s set up your business.</div>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { step: '1', title: 'Business setup', desc: '~5 minutes' },
          { step: '2', title: 'Payment processing', desc: 'Connect Stripe (~10 min)' },
          { step: '3', title: 'Start selling', desc: 'Accept your first payment' },
        ].map((item) => (
          <div key={item.step} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
              {item.step}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{item.title}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onNext} className="w-full" size="lg">
        Let&apos;s Get Started
      </Button>
    </div>
  );
}
