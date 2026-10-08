'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FullScreenLoading } from '@/components/ui/Loading';

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    let resolved = false;

    const redirectToOnboarding = () => {
      if (!mounted || resolved) return;
      resolved = true;
      router.replace('/auth/onboarding');
    };

    // Auth must never strand a protected route on a permanent spinner when
    // Supabase is slow or unavailable in the hosting environment.
    const timeoutId = window.setTimeout(redirectToOnboarding, 8000);

    const check = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted || resolved) return;
        if (!data.session) {
          redirectToOnboarding();
          return;
        }
        resolved = true;
        setAuthenticated(true);
        setReady(true);
      } catch (error) {
        console.error('Error checking authentication:', error);
        redirectToOnboarding();
      } finally {
        window.clearTimeout(timeoutId);
      }
    };
    void check();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted || resolved) return;
      if (session) {
        resolved = true;
        setAuthenticated(true);
        setReady(true);
      } else {
        redirectToOnboarding();
      }
    });
    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (!ready || !authenticated) return <FullScreenLoading message="Checking your session..." />;
  return <>{children}</>;
}
