import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { AdminRepository } from './data/repository';
import { createSupabaseRepository } from './data/supabaseRepository';
import { loadLocalStore } from './data/localLoader';

/**
 * One role: admin. Authorisation is decided by the database (`public.is_admin()`),
 * never by user-editable metadata. Every read and write is also protected by RLS,
 * so this gate is for experience, not for security.
 */
export type SessionStatus =
  | 'loading'
  | 'signed-out'
  | 'forbidden'
  | 'unavailable'
  | 'ready';

type AdminSessionValue = {
  status: SessionStatus;
  email: string | null;
  repository: AdminRepository | null;
  isLocalPreview: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterLocalPreview: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
};

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

const LOCAL_SESSION_KEY = 'gh-admin-local-session';

/** Development without a database is the only situation where local preview exists. */
export const LOCAL_PREVIEW_AVAILABLE = import.meta.env.DEV && !isSupabaseConfigured;

async function checkAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [repository, setRepository] = useState<AdminRepository | null>(null);
  const [isLocalPreview, setIsLocalPreview] = useState(false);

  const openLocal = useCallback(async () => {
    if (!loadLocalStore) return;
    const { createLocalRepository } = await loadLocalStore();
    setRepository(createLocalRepository());
    setIsLocalPreview(true);
    setEmail(null);
    setStatus('ready');
  }, []);

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured) {
      if (LOCAL_PREVIEW_AVAILABLE && sessionStorage.getItem(LOCAL_SESSION_KEY) === '1') {
        void openLocal();
      } else {
        setStatus(LOCAL_PREVIEW_AVAILABLE ? 'signed-out' : 'unavailable');
      }
      return;
    }

    const resolve = async (userEmail: string | null) => {
      if (!userEmail) {
        if (!active) return;
        setEmail(null);
        setRepository(null);
        setStatus('signed-out');
        return;
      }
      const admin = await checkAdmin();
      if (!active) return;
      setEmail(userEmail);
      if (admin) {
        setRepository(createSupabaseRepository());
        setStatus('ready');
      } else {
        setRepository(null);
        setStatus('forbidden');
      }
    };

    void supabase.auth.getSession().then(({ data }) => resolve(data.session?.user.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolve(session?.user.email ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [openLocal]);

  const signIn = useCallback(async (userEmail: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: userEmail.trim(), password });
    if (error) {
      throw new Error(
        error.message === 'Invalid login credentials'
          ? 'That email and password do not match an account.'
          : error.message,
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    if (isLocalPreview) {
      sessionStorage.removeItem(LOCAL_SESSION_KEY);
      setIsLocalPreview(false);
      setRepository(null);
      setStatus('signed-out');
      return;
    }
    await supabase.auth.signOut();
  }, [isLocalPreview]);

  const enterLocalPreview = useCallback(async () => {
    if (!LOCAL_PREVIEW_AVAILABLE) return;
    sessionStorage.setItem(LOCAL_SESSION_KEY, '1');
    await openLocal();
  }, [openLocal]);

  const sendPasswordReset = useCallback(async (userEmail: string) => {
    const lang = window.location.pathname.split('/')[1] || 'en';
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail.trim(), {
      redirectTo: `${window.location.origin}/${lang}/auth/update-password`,
    });
    if (error) throw new Error(error.message);
  }, []);

  const value = useMemo<AdminSessionValue>(
    () => ({ status, email, repository, isLocalPreview, signIn, signOut, enterLocalPreview, sendPasswordReset }),
    [status, email, repository, isLocalPreview, signIn, signOut, enterLocalPreview, sendPasswordReset],
  );

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSessionValue {
  const value = useContext(AdminSessionContext);
  if (!value) throw new Error('useAdminSession must be used inside AdminSessionProvider');
  return value;
}

/** For screens that only render once the session is ready. */
export function useRepository(): AdminRepository {
  const { repository } = useAdminSession();
  if (!repository) throw new Error('Admin repository is not ready');
  return repository;
}
