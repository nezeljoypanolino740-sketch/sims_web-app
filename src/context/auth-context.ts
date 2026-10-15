import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '@/types/models';

export interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  /** True while the first session is being restored or the profile is loading for the first time. */
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
