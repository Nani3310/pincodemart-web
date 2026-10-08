'use client';

import SettingsScreen from '@/components/settings/SettingsScreen';
import { AuthGate } from '@/components/auth/AuthGate';

export default function SettingsPage() {
  return <AuthGate><SettingsScreen /></AuthGate>;
}
