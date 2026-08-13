'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onboardingApi } from '@/lib/onboarding';
import { useAuthStore } from '@/hooks/useAuth';

export default function StripeReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setMerchantId } = useAuthStore();
  const [message, setMessage] = useState('Processing your Stripe connection...');

  useEffect(() => {
    const merchantId = searchParams.get('merchantId');
    if (merchantId) {
      // Ensure this merchant is set as active
      localStorage.setItem('currentMerchantId', merchantId);
    }

    onboardingApi.handleStripeReturn()
      .then((result) => {
        if (result.chargesEnabled) {
          setMessage('Stripe connected successfully! Redirecting...');
        } else {
          setMessage('Verification in progress. Redirecting...');
        }
      })
      .catch(() => {
        setMessage('Redirecting back to onboarding...');
      })
      .finally(() => {
        setTimeout(() => {
          router.push('/onboarding?stripe=return&step=7');
        }, 1500);
      });
  }, [router, searchParams, setMerchantId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
          <svg className="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}
