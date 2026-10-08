'use client';

import { Suspense } from 'react';
import TravelScreen from '@/components/travel/TravelScreen';
import { FullScreenLoading } from '@/components/ui/Loading';
import { AuthGate } from '@/components/auth/AuthGate';

export default function TravelPage() {
  return (
    <Suspense fallback={<FullScreenLoading message="Loading travel..." />}>
      <AuthGate><TravelScreen /></AuthGate>
    </Suspense>
  );
}
