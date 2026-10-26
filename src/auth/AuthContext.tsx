import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthSession } from './types';
import { clearSession, login as requestLogin, restoreSession, saveSession } from '../services/authService';

type AuthContextValue = {
  session: AuthSession | null;
  isRestoring: boolean;
  signIn: (email: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let mounted = true;
    restoreSession()
      .then((saved) => { if (mounted) setSession(saved); })
      .catch(() => { if (mounted) setSession(null); })
      .finally(() => { if (mounted) setIsRestoring(false); });

    return () => { mounted = false; };
  }, []);

  const signIn = useCallback(async (email: string, senha: string) => {
    const nextSession = await requestLogin(email, senha);
    await saveSession(nextSession);
    setSession(nextSession);
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, isRestoring, signIn, signOut }), [session, isRestoring, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa ser usado dentro de AuthProvider.');
  return context;
}
