'use client';

import ShopDetailScreen from '@/components/shops/ShopDetailScreen';
import { AuthGate } from '@/components/auth/AuthGate';

export default function ShopDetailPage() {
  return <AuthGate><ShopDetailScreen /></AuthGate>;
}
