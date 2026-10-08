'use client';

import HomeScreen from '@/components/home/HomeScreen';
import { AuthGate } from '@/components/auth/AuthGate';

export default function HomePage() {
  return <AuthGate><HomeScreen /></AuthGate>;
}
