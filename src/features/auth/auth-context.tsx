import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';

export interface AuthState {
  user: Pick<User, 'id' | 'email'> | null;
  loading: boolean;
  error: string | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}
export const AuthContext = createContext<AuthState | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is required.');
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState['user']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let changed = false;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        if (!active) return;
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!active) return;
          changed = true;
          setUser(session?.user ?? null);
          setLoading(false);
          setError(null);
        });
        unsubscribe = () => listener.subscription.unsubscribe();
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!active || changed) return;
        if (sessionError) throw sessionError;
        setUser(data.session?.user ?? null);
        setLoading(false);
      } catch {
        if (!active || changed) return;
        setError(
          'Your session could not be checked. Check your connection and reload to try again.',
        );
        setLoading(false);
      }
    })();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { supabase } = await import('../../lib/supabase');
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (authError) throw authError;
    if (!data.session) throw new Error('No session was returned.');
    setUser(data.session.user);
  }
  async function signOut() {
    const { supabase } = await import('../../lib/supabase');
    const { error: authError } = await supabase.auth.signOut({ scope: 'local' });
    if (authError) throw authError;
    setUser(null);
  }
  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
