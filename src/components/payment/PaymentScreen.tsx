'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface PaymentScreenProps {
  purpose: string;
  adId?: string;
  shopId?: string;
}

export default function PaymentScreen({ purpose, adId, shopId }: PaymentScreenProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isMarketplaceAccess = purpose === 'marketplace_access';
  const isAdPayment = purpose.startsWith('ad_');
  const paymentInfo: Record<string, { amount: number; description: string }> = {
    marketplace_access: { amount: 300, description: 'Marketplace Access - 30 days' },
    ad_tier_1: { amount: 500, description: 'Tier 1 advertisement' },
    ad_tier_2: { amount: 300, description: 'Tier 2 advertisement' },
    ad_tier_3: { amount: 150, description: 'Tier 3 advertisement' },
  };
  const amount = paymentInfo[purpose]?.amount || 300;
  const description = paymentInfo[purpose]?.description || 'Marketplace Access - 30 days';

  const submitRequest = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('phone, phone_number')
        .eq('id', user.id)
        .maybeSingle();

      if (isAdPayment) {
        if (!adId) throw new Error('Advertisement details are missing. Please return to your store and try again.');
        const { error: adPaymentError } = await supabase.rpc('request_ad_payment', { p_ad_id: adId });
        if (adPaymentError) throw adPaymentError;
      } else {
        const resolvedShopId = shopId || await resolveCurrentShopId(user.id);
        if (!resolvedShopId) {
          throw new Error('Your shop must be submitted before requesting marketplace access.');
        }

        const phone = profile?.phone || profile?.phone_number || user.phone || '';
        if (phone.replace(/\D/g, '').length < 10) {
          throw new Error('Add a valid phone number to your profile before continuing.');
        }

        const { error: paymentError } = await supabase.rpc('complete_merchant_marketplace_payment', {
          p_raw_phone: phone,
          p_shop_id: resolvedShopId,
          p_payment_method: 'manual',
          p_transaction_ref: `manual-${crypto.randomUUID()}`,
          p_amount_inr: 300,
        });

        if (paymentError) throw paymentError;
      }

      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The access request could not be submitted.');
    } finally {
      setLoading(false);
    }
  };

  const resolveCurrentShopId = async (ownerId: string) => {
    const { data, error: shopError } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (shopError) throw shopError;
    return data?.id;
  };

  return (
    <div className="min-h-dvh app-page-bg flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {submitted ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-text-primary mb-2">Publishing Unlocked</h2>
            <p className="text-text-secondary mb-6">
              Your ₹{amount} marketplace payment was recorded. You can now add and publish products for 30 days.
            </p>
            <Button className="w-full" onClick={() => router.push('/merchant/store')}>
              <Clock className="w-4 h-4" />
              Go to My Store
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-text-primary mb-2">{isMarketplaceAccess ? 'Request Marketplace Access' : 'Pay and Submit Advertisement'}</h1>
            <p className="text-text-secondary mb-6">{description}</p>

            <div className="bg-primary-light/60 border border-primary/15 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Amount</span>
                <span className="text-2xl font-bold text-primary">₹{amount}</span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-primary-accent/10 border border-primary-accent/35 rounded-lg text-error text-sm mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              onClick={submitRequest}
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Submitting...' : `${isAdPayment ? 'Pay' : 'Submit'} ₹${amount} for Approval`}
            </Button>

            <p className="text-center text-xs text-text-secondary mt-4">Payment is recorded securely and your shop access is updated immediately.</p>
          </>
        )}
      </Card>
    </div>
  );
}
