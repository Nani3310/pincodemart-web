'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FullScreenLoading } from '@/components/ui/Loading';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    let hasRedirected = false;

    // The root page only decides where to send the user. If Supabase is
    // unreachable (bad/missing deployment env, DNS, or a transient outage),
    // do not leave the entire site on an infinite spinner.
    const redirectToOnboarding = () => {
      if (!isMounted || hasRedirected) return;
      hasRedirected = true;
      router.replace('/auth/onboarding');
    };

    const timeoutId = window.setTimeout(redirectToOnboarding, 8000);

    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted || hasRedirected) return;
        
        if (session) {
          const requestedRole=sessionStorage.getItem('pincodemart-login-role');
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, role, onboarding_completed')
            .eq('id', session.user.id)
            .single();
          if (!isMounted || hasRedirected) return;

          if (profile) {
            hasRedirected = true;
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
            redirectToOnboarding();
          }
        } else {
          redirectToOnboarding();
        }
      } catch (error) {
        console.error('Error checking session:', error);
        redirectToOnboarding();
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    void checkSession();
    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [router]);

  return <FullScreenLoading message="Loading..." />;
}
