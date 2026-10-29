import * as SecureStore from 'expo-secure-store';
import type { AuthenticatedSession } from '../types/auth';

export const SESSION_STORAGE_KEY = 'MeuControleFinanceiroMobile.session.v1';

export type SessionStorageOperation = 'read' | 'save' | 'remove' | 'invalid';

export class SessionStorageError extends Error {
  constructor(
    public readonly operation: SessionStorageOperation,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SessionStorageError';
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isAuthenticatedSession(value: unknown): value is AuthenticatedSession {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Partial<AuthenticatedSession>;
  const usuario = candidate.usuario;
  if (typeof usuario !== 'object' || usuario === null) return false;

  if (candidate.version !== 1
    || Number.isNaN(usuario.id)
    || !Number.isInteger(usuario.id)
    || !isNonEmptyString(usuario.nome)
    || !isNonEmptyString(usuario.email)) {
    return false;
  }

  if (candidate.source === 'mock') return candidate.token === null;
  if (candidate.source === 'api') return isNonEmptyString(candidate.token);
  return false;
}

export async function getStoredSession(): Promise<AuthenticatedSession | null> {
  let serialized: string | null;

  try {
    serialized = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
  } catch (error) {
    throw new SessionStorageError(
      'read',
      'Não foi possível recuperar a sessão segura.',
      error,
    );
  }

  if (serialized === null) return null;

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isAuthenticatedSession(parsed)) {
      throw new Error('Sessão armazenada possui formato inválido.');
    }
    return parsed;
  } catch (error) {
    throw new SessionStorageError(
      'invalid',
      'A sessão armazenada é inválida ou está em formato incompatível.',
      error,
    );
  }
}

export async function storeSession(session: AuthenticatedSession): Promise<void> {
  if (!isAuthenticatedSession(session)) {
    throw new SessionStorageError(
      'save',
      'Não foi possível salvar uma sessão inválida.',
    );
  }

  try {
    await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    throw new SessionStorageError(
      'save',
      'Não foi possível salvar a sessão segura.',
      error,
    );
  }
}

export async function clearStoredSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
  } catch (error) {
    throw new SessionStorageError(
      'remove',
      'Não foi possível remover a sessão segura.',
      error,
    );
  }
}
