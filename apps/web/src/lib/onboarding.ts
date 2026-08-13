import { apiClient } from './api';

export interface OnboardingStatus {
  merchantId: string;
  currentStep: number;
  nextStep: number;
  completedSteps: number[];
  onboardingCompleted: boolean;
  steps: Record<number, boolean>;
  merchant: {
    id: string;
    name: string;
    status: string;
    stripeAccountId: string | null;
    stripeOnboardingComplete: boolean;
    stripeChargesEnabled: boolean;
    stripePayoutsEnabled: boolean;
    subscriptionStatus: string | null;
  };
}

export const ONBOARDING_STEPS = [
  { step: 1, title: 'Account Created', description: 'Your account is ready', icon: '✓' },
  { step: 2, title: 'Business Info', description: 'Tell us about your business', icon: '🏪' },
  { step: 3, title: 'Business Type', description: 'Select your business type', icon: '📋' },
  { step: 4, title: 'Business Address', description: 'Where is your business located?', icon: '📍' },
  { step: 5, title: 'Owner Info', description: 'Primary contact information', icon: '👤' },
  { step: 6, title: 'Payment Setup', description: 'Connect Stripe to accept payments', icon: '💳' },
  { step: 7, title: 'Verification', description: 'Identity & business verification', icon: '🔒' },
  { step: 8, title: 'Bank Account', description: 'Setup your payout account', icon: '🏦' },
  { step: 9, title: 'Subscription', description: 'Start your $25/month plan', icon: '⭐' },
  { step: 10, title: 'First Location', description: 'Add your store location', icon: '📍' },
  { step: 11, title: 'Products', description: 'Add your first products', icon: '📦' },
  { step: 12, title: 'Device', description: 'Connect your POS device', icon: '📱' },
  { step: 13, title: 'Tap to Pay', description: 'Enable contactless payments', icon: '⚡' },
  { step: 14, title: 'Test Transaction', description: 'Run a test payment', icon: '🧪' },
  { step: 15, title: 'Ready to Sell', description: 'You\'re all set!', icon: '🎉' },
] as const;

export const onboardingApi = {
  getStatus: () => apiClient.get<OnboardingStatus>('/onboarding/status'),

  updateBusinessInfo: (data: {
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    description?: string;
  }) => apiClient.put<OnboardingStatus>('/onboarding/business-info', data),

  updateBusinessType: (data: {
    businessType: string;
    taxId?: string;
    businessCategory?: string;
  }) => apiClient.put<OnboardingStatus>('/onboarding/business-type', data),

  updateBusinessAddress: (data: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    timezone?: string;
  }) => apiClient.put<OnboardingStatus>('/onboarding/business-address', data),

  updateOwnerInfo: (data: {
    firstName: string;
    lastName: string;
    phone?: string;
    title?: string;
  }) => apiClient.put<OnboardingStatus>('/onboarding/owner-info', data),

  initiateStripeConnect: () =>
    apiClient.post<{ url: string; accountId: string }>('/onboarding/stripe/connect'),

  handleStripeReturn: () =>
    apiClient.get<{
      isComplete: boolean;
      chargesEnabled: boolean;
      payoutsEnabled: boolean;
    }>('/onboarding/stripe/return'),

  createLocation: (data: {
    name: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    timezone?: string;
    phone?: string;
    email?: string;
    defaultTaxRate?: number;
  }) => apiClient.post<{ id: string; name: string }>('/onboarding/location', data),

  completeOnboarding: () => apiClient.post<OnboardingStatus>('/onboarding/complete'),
};
