'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Phone, ArrowLeft, AlertCircle } from 'lucide-react';

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

export default function PhoneLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    setError('');
    if (phone.length !== 10) {
      setError('Phone must be 10 digits');
      return;
    }

    setLoading(true);
    try {
      // In development, OTP is always "1234"
      // In production, this would send actual SMS via Twilio
      setOtpSent(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to send OTP'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    
    // Development OTP is "1234"
    if (otp !== '1234') {
      setError('Invalid OTP. Use "1234" for development');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ 
          phone: `+91${phone}`,
          phone_number: `+91${phone}`,
          is_phone_verified: true 
        })
        .eq('id', user.id);

      if (error) throw error;

      router.push('/auth/merchant-onboarding');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh app-page-bg auth-splash-bg flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full border-primary/30 shadow-2xl">
        <CardHeader>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-primary">Phone Verification</h1>
            <p className="text-text-secondary mt-2">
              {otpSent ? 'Enter the OTP sent to your phone' : 'Verify your phone number'}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-primary-accent/10 border border-primary-accent/35 rounded-lg text-error text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {!otpSent ? (
              <>
                <Input
                  type="tel"
                  label="Phone Number"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={10}
                  icon={<Phone className="w-4 h-4 text-text-secondary" />}
                />
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={handleSendOTP}
                  className="w-full text-base font-extrabold shadow-md shadow-sky-500/25"
                  disabled={loading}
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              </>
            ) : (
              <>
                <Input
                  type="text"
                  label="Enter OTP"
                  placeholder="1234"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={4}
                />
                <Button
                  variant="accept"
                  size="lg"
                  onClick={handleVerifyOTP}
                  className="w-full text-base font-extrabold shadow-md shadow-emerald-500/25"
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Verify OTP & Continue'}
                </Button>
                <button
                  onClick={() => {
                    setOtpSent(false);
                    setOtp('');
                  }}
                  className="w-full text-sm text-text-secondary hover:text-primary"
                >
                  Change phone number
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
