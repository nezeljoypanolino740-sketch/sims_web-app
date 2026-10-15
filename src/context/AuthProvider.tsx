import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { AuthContext, type AuthContextValue } from '@/context/auth-context';
import { getErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { fetchProfile, signOut as signOutRequest } from '@/services/authService';
import type { Profile } from '@/types/models';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const profileRef = useRef<Profile | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const manualSignOut = useRef(false);

  const loadProfile = useCallback(async (userId: string) => {
    if (profileRef.current && profileRef.current.id !== userId) {
      profileRef.current = null;
      setProfile(null);
    }
    if (!profileRef.current) setProfileLoading(true);
    try {
      const next = await fetchProfile(userId);
      profileRef.current = next;
      setProfile(next);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Your account details could not be loaded.'));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      const hadSession = sessionRef.current !== null;
      sessionRef.current = next;
      setSession(next);

      if (event === 'SIGNED_OUT') {
        profileRef.current = null;
        setProfile(null);
        setProfileLoading(false);
        setInitializing(false);
        if (hadSession && !manualSignOut.current) {
          toast.warning('Your session has ended. Please sign in again.');
        }
        manualSignOut.current = false;
        return;
      }

      if (event === 'INITIAL_SESSION') setInitializing(false);

      if (next && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        if (!profileRef.current) setProfileLoading(true);
        const userId = next.user.id;
        // Do not call Supabase synchronously inside this callback (it can deadlock the auth lock).
        setTimeout(() => {
          void loadProfile(userId);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) await loadProfile(data.session.user.id);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    manualSignOut.current = true;
    try {
      await signOutRequest();
    } catch (error) {
      manualSignOut.current = false;
      toast.error(getErrorMessage(error));
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, profile, loading: initializing || profileLoading, signOut, refreshProfile }),
    [session, profile, initializing, profileLoading, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
