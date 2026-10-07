'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FullScreenLoading } from '@/components/ui/Loading';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        if (session) {
          const requestedRole=sessionStorage.getItem('pincodemart-login-role');
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, role, onboarding_completed')
            .eq('id', session.user.id)
            .single();
          if (!isMounted) return;

          if (profile) {
            if (!profile.onboarding_completed) {
              router.replace('/auth/user-carousel');
            } else if (profile.role === 'admin') {
              router.replace('/admin/dashboard');
            } else {
              sessionStorage.removeItem('pincodemart-login-role');
              // A merchant login opens the store; other sessions open the marketplace.
              router.replace(requestedRole === 'merchant' ? '/merchant/store' : '/home');
            }
          } else {
            router.replace('/auth/onboarding');
          }
        } else {
          router.replace('/auth/onboarding');
        }
      } catch (error) {
        console.error('Error checking session:', error);
        if (isMounted) router.replace('/auth/onboarding');
      }
    }

    checkSession();
    return () => {
      isMounted = false;
    };
  }, [router]);

  return <FullScreenLoading message="Loading..." />;
}
