'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, Lock, User, Phone, MapPin, AlertCircle, ArrowLeft, Info } from 'lucide-react';

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

export default function SignupScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    pincode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.phone && formData.phone.length !== 10) {
      setError('Phone must be 10 digits');
      return;
    }

    if (formData.pincode && formData.pincode.length !== 6) {
      setError('Pincode must be 6 digits');
      return;
    }

    if (!termsAccepted) {
      setError('Please accept the terms, privacy, payments and refund policy');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            pincode: formData.pincode,
          },
        },
      });

      if (error) throw error;

      // Create profile
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone || null,
          pincode: formData.pincode || null,
          role: 'customer',
          onboarding_completed: false,
          terms_accepted: true,
          is_phone_verified: false,
          role_selected: false,
        });

        if (profileError) throw profileError;

        router.push('/auth/role-selection');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Signup failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh reference-auth-page flex flex-col justify-between sm:justify-center sm:gap-6 sm:py-10 relative overflow-hidden">
      {/* Background ambient glow circle */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-24 w-80 h-80 bg-sky-100/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top App Canvas */}
      <div className="p-6 pt-10 max-w-md w-full mx-auto relative z-10">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-text-primary flex items-center justify-center transition-all mb-6"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <h1 className="text-3xl font-black text-white tracking-tight">Create<br />account</h1>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Start with your email and password.
        </p>
      </div>

      {/* Bottom Sheet Card */}
      <div className="w-full max-w-md mx-auto bg-white rounded-t-[36px] sm:rounded-[36px] shadow-2xl p-6 sm:p-8 relative z-10 border-t border-slate-100 max-h-[82dvh] sm:max-h-none overflow-y-auto">
        {/* Grab bar */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-5" />

        <form onSubmit={handleSignup} className="space-y-3.5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Full Name</label>
            <Input
              type="text"
              name="fullName"
              placeholder="e.g. Rahul Sharma"
              value={formData.fullName}
              onChange={handleChange}
              required
              icon={<User className="w-4 h-4 text-cyan-600" />}
              className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Email</label>
            <Input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              icon={<Mail className="w-4 h-4 text-cyan-600" />}
              className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Phone</label>
              <Input
                type="tel"
                name="phone"
                placeholder="10 digits"
                value={formData.phone}
                onChange={handleChange}
                maxLength={10}
                icon={<Phone className="w-4 h-4 text-cyan-600" />}
                className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Pincode</label>
              <Input
                type="text"
                name="pincode"
                placeholder="6 digits"
                value={formData.pincode}
                onChange={handleChange}
                maxLength={6}
                icon={<MapPin className="w-4 h-4 text-cyan-600" />}
                className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">Password</label>
              <span className="text-[11px] text-slate-400 flex items-center gap-0.5"><Info className="w-3 h-3 text-slate-400" /> min 6 chars</span>
            </div>
            <Input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              icon={<Lock className="w-4 h-4 text-cyan-600" />}
              className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Confirm password</label>
            <Input
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              icon={<Lock className="w-4 h-4 text-cyan-600" />}
              className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-sm"
            />
          </div>

          <label className="flex items-start gap-2.5 pt-1 text-[11px] text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded text-blue-600 accent-blue-600"
            />
            <span>
              I agree to the{' '}
              <button
                type="button"
                onClick={() => router.push('/legal')}
                className="font-bold text-[#0284C7] hover:underline"
              >
                Terms of Service & Privacy Policy
              </button>
            </span>
          </label>

          {/* Highlighted Continue / Signup Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="signup"
              size="lg"
              className="w-full text-base font-black shadow-lg shadow-blue-500/25"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Continue'}
            </Button>
          </div>

          <div className="text-center text-xs text-slate-600 pt-2">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="text-[#0284C7] hover:text-[#0369A1] font-extrabold hover:underline"
            >
              Log in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

