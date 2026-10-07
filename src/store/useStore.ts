import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { Profile } from '@/types';

interface UserSession {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isAuthenticated: boolean;
}

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  pincode: string | null;
  permissionGranted: boolean;
}

interface AppState {
  userSession: UserSession;
  location: LocationState;
  setUserSession: (session: UserSession) => void;
  setLocation: (location: Partial<LocationState>) => void;
  clearSession: () => void;
}

export const useStore = create<AppState>((set) => ({
  userSession: {
    user: null,
    profile: null,
    session: null,
    isAuthenticated: false,
  },
  location: {
    latitude: null,
    longitude: null,
    city: null,
    pincode: null,
    permissionGranted: false,
  },
  setUserSession: (session) => set({ userSession: session }),
  setLocation: (location) => set((state) => ({ location: { ...state.location, ...location } })),
  clearSession: () => set({
    userSession: {
      user: null,
      profile: null,
      session: null,
      isAuthenticated: false,
    },
  }),
}));
