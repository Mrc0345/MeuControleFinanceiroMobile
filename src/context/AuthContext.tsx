import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthModeConfigurationError, getAuthMode } from '../config/auth';
import { ApiError } from '../services/httpClient';
import { login as loginRequest, MockCredentialsError } from '../services/authService';
import {
  clearStoredSession,
  getStoredSession,
  SessionStorageError,
  storeSession,
} from '../services/sessionStorage';
import type { AuthMode } from '../config/auth';
import type { AuthenticatedSession, AuthenticatedUser } from '../types/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';
export type AuthErrorOperation = 'restore' | 'login' | 'logout';

export interface AuthError {
  operation: AuthErrorOperation;
  message: string;
}

export interface AuthContextValue {
  status: AuthStatus;
  session: AuthenticatedSession | null;
  user: AuthenticatedUser | null;
  error: AuthError | null;
  authMode: AuthMode;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  retryRestore: () => Promise<void>;
}

interface AuthState {
  status: AuthStatus;
  session: AuthenticatedSession | null;
  error: AuthError | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function authenticatedState(session: AuthenticatedSession): AuthState {
  return { status: 'authenticated', session, error: null };
}

function unauthenticatedState(error: AuthError | null = null): AuthState {
  return { status: 'unauthenticated', session: null, error };
}

function errorState(operation: AuthErrorOperation, message: string): AuthState {
  return {
    status: 'error',
    session: null,
    error: { operation, message },
  };
}

function getJwtExpiration(token: string): number | null {
  const segments = token.split('.');
  if (segments.length !== 3) return null;

  try {
    const normalizedPayload = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddingLength = (4 - normalizedPayload.length % 4) % 4;
    const decodedPayload = globalThis.atob(normalizedPayload + '='.repeat(paddingLength));
    const payload: unknown = JSON.parse(decodedPayload);

    if (typeof payload !== 'object' || payload === null || !('exp' in payload)) return null;

    const expiration = payload.exp;
    return typeof expiration === 'number' && Number.isFinite(expiration) ? expiration : null;
  } catch {
    return null;
  }
}

function isExpired(token: string): boolean {
  const expiration = getJwtExpiration(token);
  return expiration !== null && expiration * 1_000 <= Date.now();
}

function operationError(error: unknown, operation: AuthErrorOperation): AuthError {
  if (error instanceof ApiError) {
    return { operation, message: error.message };
  }

  if (error instanceof SessionStorageError) {
    return { operation, message: error.message };
  }

  if (error instanceof MockCredentialsError) {
    return { operation, message: error.message };
  }

  if (error instanceof AuthModeConfigurationError) {
    return { operation, message: error.message };
  }

  const messages: Record<AuthErrorOperation, string> = {
    restore: 'Não foi possível restaurar a sessão.',
    login: 'Não foi possível realizar o login.',
    logout: 'Não foi possível encerrar a sessão.',
  };
  return { operation, message: messages[operation] };
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  const authMode = getAuthMode();
  const [authState, setAuthState] = useState<AuthState>({
    status: 'loading',
    session: null,
    error: null,
  });
  const isMounted = useRef(true);
  const didRestore = useRef(false);
  const restoreOperation = useRef<Promise<void> | null>(null);
  const loginOperation = useRef<Promise<void> | null>(null);
  const logoutOperation = useRef<Promise<void> | null>(null);

  const restoreSession = useCallback(async (): Promise<void> => {
    if (restoreOperation.current) return restoreOperation.current;

    const operation = (async () => {
      if (isMounted.current) {
        setAuthState({ status: 'loading', session: null, error: null });
      }

      try {
        const storedSession = await getStoredSession();
        if (!isMounted.current) return;

        if (storedSession === null) {
          setAuthState(unauthenticatedState());
          return;
        }

        if (storedSession.source !== authMode) {
          await clearStoredSession();
          if (isMounted.current) setAuthState(unauthenticatedState());
          return;
        }

        if (storedSession.source === 'api' && isExpired(storedSession.token)) {
          await clearStoredSession();
          if (isMounted.current) setAuthState(unauthenticatedState());
          return;
        }

        setAuthState(authenticatedState(storedSession));
      } catch (error) {
        if (!isMounted.current) return;

        if (error instanceof SessionStorageError && error.operation === 'invalid') {
          try {
            await clearStoredSession();
            if (isMounted.current) setAuthState(unauthenticatedState());
          } catch (clearError) {
            if (!isMounted.current) return;
            const authError = operationError(clearError, 'restore');
            setAuthState(errorState(authError.operation, authError.message));
          }
          return;
        }

        const authError = operationError(error, 'restore');
        setAuthState(errorState(authError.operation, authError.message));
      }
    })();

    restoreOperation.current = operation;
    try {
      await operation;
    } finally {
      restoreOperation.current = null;
    }
  }, [authMode]);

  useEffect(() => {
    isMounted.current = true;
    if (!didRestore.current) {
      didRestore.current = true;
      void restoreSession();
    }
    return () => {
      isMounted.current = false;
    };
  }, [restoreSession]);

  const login = useCallback(async (email: string, senha: string): Promise<void> => {
    if (loginOperation.current) return loginOperation.current;

    const operation = (async () => {
      try {
        if (restoreOperation.current) await restoreOperation.current;
        const session = await loginRequest({ email, senha });
        await storeSession(session);
        if (isMounted.current) setAuthState(authenticatedState(session));
      } catch (error) {
        if (!isMounted.current) return;

        if (error instanceof SessionStorageError) {
          setAuthState(errorState('login', operationError(error, 'login').message));
        } else {
          setAuthState(unauthenticatedState(operationError(error, 'login')));
        }
        throw error;
      }
    })();

    loginOperation.current = operation;
    try {
      await operation;
    } finally {
      loginOperation.current = null;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    if (logoutOperation.current) return logoutOperation.current;

    const operation = (async () => {
      try {
        if (restoreOperation.current) await restoreOperation.current;
        await clearStoredSession();
        if (isMounted.current) setAuthState(unauthenticatedState());
      } catch (error) {
        if (!isMounted.current) return;
        const authError = operationError(error, 'logout');
        setAuthState(errorState(authError.operation, authError.message));
        throw error;
      }
    })();

    logoutOperation.current = operation;
    try {
      await operation;
    } finally {
      logoutOperation.current = null;
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    status: authState.status,
    session: authState.session,
    user: authState.session?.usuario ?? null,
    error: authState.error,
    authMode,
    login,
    logout,
    retryRestore: restoreSession,
  }), [authMode, authState, login, logout, restoreSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  }
  return context;
}
