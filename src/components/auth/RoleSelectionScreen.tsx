'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { Card } from '@/components/ui/Card';
import { ShoppingBag, Store, ArrowRight } from 'lucide-react';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { setUserSession } = useStore();

  const handleRoleSelect = async (role: 'customer' | 'merchant') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Update profile role
      const { error } = await supabase
        .from('profiles')
        .update({ role, role_selected: true })
        .eq('id', user.id);

      if (error) throw error;

      // Update session
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setUserSession({
        user,
        profile,
        session: (await supabase.auth.getSession()).data.session,
        isAuthenticated: true,
      });

      if (role === 'merchant') {
        router.push('/auth/phone-login');
      } else {
        router.push('/auth/user-carousel');
      }
    } catch (error) {
      console.error('Error selecting role:', error);
    }
  };

  return (
    <div className="min-h-dvh app-page-bg auth-splash-bg flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 border-primary/30 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Choose Your Role</h1>
          <p className="text-text-secondary mt-2">How do you want to use LocalBazaar?</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleRoleSelect('customer')}
            className="w-full p-6 border-2 border-primary/25 bg-surface/85 rounded-lg hover:border-primary hover:bg-primary-light transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-light rounded-lg">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-text-primary">I want to buy</h3>
                  <p className="text-sm text-text-secondary">Browse shops and products</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors" />
            </div>
          </button>

          <button
            onClick={() => handleRoleSelect('merchant')}
            className="w-full p-6 border-2 border-primary/25 bg-surface/85 rounded-lg hover:border-primary hover:bg-primary-light transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-light rounded-lg">
                  <Store className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-text-primary">I want to sell</h3>
                  <p className="text-sm text-text-secondary">List your shop and products</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors" />
            </div>
          </button>
        </div>
      </Card>
    </div>
  );
}
