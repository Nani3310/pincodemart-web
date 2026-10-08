'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PaymentScreen from '@/components/payment/PaymentScreen';
import { AuthGate } from '@/components/auth/AuthGate';

function PaymentPageContent() {
  const searchParams = useSearchParams();
  const purpose = searchParams.get('purpose') || 'marketplace_access';
  const adId = searchParams.get('ad_id') || undefined;
  const shopId = searchParams.get('shop_id') || undefined;
  
  return <AuthGate><PaymentScreen purpose={purpose} adId={adId} shopId={shopId} /></AuthGate>;
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <PaymentPageContent />
    </Suspense>
  );
}
