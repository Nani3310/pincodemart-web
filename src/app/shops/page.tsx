'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ShopListingScreen from '@/components/shops/ShopListingScreen';

function ShopsPageContent() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get('category');
  
  return <ShopListingScreen categorySlug={categorySlug} />;
}

export default function ShopsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <ShopsPageContent />
    </Suspense>
  );
}
