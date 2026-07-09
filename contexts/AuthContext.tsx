import React, { createContext, useState, useContext, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  tenantId: string | null;
  tenantName: string | null;
  needsOnboarding: boolean;
  signOut: () => Promise<void>;
  refreshTenant: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  async function loadTenantForUser(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, tenants(name)')
      .eq('id', userId)
      .single();

    if (!profile) {
      setNeedsOnboarding(true);
      setTenantId(null);
      setTenantName(null);
      return;
    }

    setNeedsOnboarding(false);
    setTenantId(profile.tenant_id);
    // @ts-ignore
    setTenantName(profile.tenants?.name ?? null);
  }

  async function refreshTenant() {
    if (session?.user?.id) {
      await loadTenantForUser(session.user.id);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.id) {
        loadTenantForUser(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        loadTenantForUser(newSession.user.id);
      } else {
        setTenantId(null);
        setTenantName(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ session, loading, tenantId, tenantName, needsOnboarding, signOut, refreshTenant }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}