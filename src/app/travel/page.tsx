'use client';

import { Suspense } from 'react';
import TravelScreen from '@/components/travel/TravelScreen';
import { FullScreenLoading } from '@/components/ui/Loading';

export default function TravelPage() {
  return (
    <Suspense fallback={<FullScreenLoading message="Loading travel..." />}>
      <TravelScreen />
    </Suspense>
  );
}
