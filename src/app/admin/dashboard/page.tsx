import AdminDashboardScreen from '@/components/admin/AdminDashboardScreen';
import { AuthGate } from '@/components/auth/AuthGate';

export default function AdminDashboardPage() {
  return <AuthGate><AdminDashboardScreen /></AuthGate>;
}
