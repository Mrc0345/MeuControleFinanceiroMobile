import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AuthSession, AuthUser } from '../auth/types';

const SESSION_KEY = 'meu-controle.auth-session';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');

type LoginResponse = { token?: unknown; usuario?: unknown; erro?: unknown };
type RegisterResponse = { mensagem?: unknown; erro?: unknown };

function getApiUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error('Configure EXPO_PUBLIC_API_URL no arquivo .env.local para conectar ao backend.');
  }
  return `${API_BASE_URL}/${path}`;
}

async function readResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as { erro?: unknown };
  if (!response.ok) {
    const message = typeof payload.erro === 'string' ? payload.erro : 'Não foi possível concluir a solicitação.';
    throw new Error(message);
  }
  return payload as T;
}

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<AuthUser>;
  return Number.isInteger(candidate.id) && typeof candidate.nome === 'string' && typeof candidate.email === 'string';
}

export async function login(email: string, senha: string): Promise<AuthSession> {
  const response = await fetch(getApiUrl('login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), senha }),
  });
  const payload = await readResponse<LoginResponse>(response);

  if (typeof payload.token !== 'string' || !isAuthUser(payload.usuario)) {
    throw new Error('O backend respondeu em um formato inesperado.');
  }

  return { token: payload.token, usuario: payload.usuario };
}

export async function register(nome: string, email: string, senha: string): Promise<void> {
  const response = await fetch(getApiUrl('usuarios'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: nome.trim(), email: email.trim(), senha }),
  });
  await readResponse<RegisterResponse>(response);
}

export async function saveSession(session: AuthSession): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function restoreSession(): Promise<AuthSession | null> {
  if (Platform.OS === 'web') return null;
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) throw new Error('Sessão inválida');
    const candidate = value as Partial<AuthSession>;
    if (typeof candidate.token !== 'string' || !isAuthUser(candidate.usuario)) throw new Error('Sessão inválida');
    return { token: candidate.token, usuario: candidate.usuario };
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
