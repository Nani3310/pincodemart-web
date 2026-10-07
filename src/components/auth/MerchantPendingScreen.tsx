'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Clock, Home, Store as StoreIcon } from 'lucide-react';

export default function MerchantPendingScreen() {
  const router = useRouter();
  const [shopStatus, setShopStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  const checkShopStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: shops, error: shopError } = await supabase
        .from('shops')
        .select('status')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (shopError) throw shopError;

      const shopStatuses = shops?.map((shop) => shop.status) || [];
      const currentStatus = shopStatuses.includes('approved')
        ? 'approved'
        : shopStatuses[0] || null;

      if (currentStatus) {
        setShopStatus(currentStatus);
        if (currentStatus === 'approved') {
          router.push('/merchant/store');
        } else if (currentStatus === 'rejected') {
          router.push('/auth/merchant-onboarding');
        }
      }
    } catch (error) {
      console.error('Error checking shop status:', error);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(checkShopStatus);
    const interval = window.setInterval(() => void checkShopStatus(), 5000);
    const handleFocus = () => void checkShopStatus();
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkShopStatus]);

  return (
    <div className="min-h-dvh app-page-bg auth-splash-bg flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 border-primary/30 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="p-4 bg-primary-light rounded-full mb-4 ring-1 ring-primary/35">
            <Clock className="w-12 h-12 text-warning" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {shopStatus === 'pending' ? 'Shop Under Review' : 'Checking Shop Status'}
          </h1>
          <p className="text-text-secondary mb-6">
            {shopStatus === 'rejected'
              ? 'Your shop needs changes before it can be approved. Please review the details and submit again.'
              : 'Your shop is currently being reviewed by our team. This usually takes 1-2 business days.'}
          </p>

          <div className="w-full bg-primary-light rounded-full h-2 mb-6">
            <div className="bg-primary h-2 rounded-full animate-pulse w-1/2" />
          </div>

          <div className="space-y-3 w-full">
            <Button
              variant="outline"
              onClick={() => router.push('/home')}
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Browse as Customer
            </Button>

            <Button
              onClick={() => router.push('/auth/merchant-onboarding')}
              className="w-full"
            >
              <StoreIcon className="w-4 h-4 mr-2" />
              Edit Shop Details
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
