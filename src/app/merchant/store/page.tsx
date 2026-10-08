import MerchantStoreScreen from '@/components/merchant/MerchantStoreScreen';
import { AuthGate } from '@/components/auth/AuthGate';

export default function MerchantStorePage() {
  return <AuthGate><MerchantStoreScreen /></AuthGate>;
}
