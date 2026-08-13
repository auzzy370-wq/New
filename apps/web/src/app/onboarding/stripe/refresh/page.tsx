'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function StripeRefreshPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Stripe called the refresh URL — the onboarding link expired
    // Redirect back so the user can regenerate it
    const merchantId = searchParams.get('merchantId');
    if (merchantId) {
      localStorage.setItem('currentMerchantId', merchantId);
    }
    setTimeout(() => {
      router.push('/onboarding?step=6');
    }, 1000);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-2xl">🔄</div>
        <p className="text-gray-600">Refreshing your Stripe onboarding link...</p>
      </div>
    </div>
  );
}
