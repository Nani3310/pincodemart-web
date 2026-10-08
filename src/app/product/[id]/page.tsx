'use client';

import ProductDetailScreen from '@/components/products/ProductDetailScreen';
import { AuthGate } from '@/components/auth/AuthGate';

export default function ProductDetailPage() {
  return <AuthGate><ProductDetailScreen /></AuthGate>;
}
