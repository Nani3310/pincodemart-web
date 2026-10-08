'use client';

import ServicesScreen from '@/components/services/ServicesScreen';
import { AuthGate } from '@/components/auth/AuthGate';

export default function ServicesPage() {
  return <AuthGate><ServicesScreen /></AuthGate>;
}
