import { getAuthMode } from '../config/auth';
import { ApiError, httpRequest } from './httpClient';
import type { AuthCredentials, AuthenticatedSession, LoginResponse } from '../types/auth';

const MOCK_CREDENTIALS = {
  email: 'teste@meucontrole.com',
  senha: '123456',
} as const;

const MOCK_USER = {
  id: 0,
  nome: 'Usuário demonstração',
  email: MOCK_CREDENTIALS.email,
} as const;

export class MockCredentialsError extends Error {
  constructor() {
    super('E-mail ou senha inválidos.');
    this.name = 'MockCredentialsError';
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isLoginResponse(value: unknown): value is LoginResponse {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Partial<LoginResponse>;
  const usuario = candidate.usuario;
  if (typeof usuario !== 'object' || usuario === null) return false;

  return isNonEmptyString(candidate.mensagem)
    && isNonEmptyString(candidate.token)
    && Number.isInteger(usuario.id)
    && isNonEmptyString(usuario.nome)
    && isNonEmptyString(usuario.email);
}

export async function login(credentials: AuthCredentials): Promise<AuthenticatedSession> {
  if (getAuthMode() === 'mock') {
    if (credentials.email.trim() !== MOCK_CREDENTIALS.email || credentials.senha !== MOCK_CREDENTIALS.senha) {
      throw new MockCredentialsError();
    }

    return {
      version: 1,
      source: 'mock',
      token: null,
      usuario: { ...MOCK_USER },
    };
  }

  const response = await httpRequest<unknown>('/login', {
    method: 'POST',
    body: credentials,
  });

  if (!isLoginResponse(response.data)) {
    throw new ApiError(
      'A API retornou uma resposta de login inesperada.',
      'invalid_response',
      response.status,
    );
  }

  return {
    version: 1,
    source: 'api',
    token: response.data.token,
    usuario: response.data.usuario,
  };
}

export async function register(nome: string, email: string, senha: string): Promise<void> {
  if (getAuthMode() !== 'api') {
    throw new Error('O cadastro exige o modo API e uma conexão com o backend.');
  }
  const response = await httpRequest<unknown>('/usuarios', {
    method: 'POST',
    body: { nome: nome.trim(), email: email.trim(), senha },
  });
  if (typeof response.data !== 'object' || response.data === null
    || !('mensagem' in response.data) || !isNonEmptyString(response.data.mensagem)) {
    throw new ApiError('A API retornou uma resposta de cadastro inesperada.', 'invalid_response', response.status);
  }
}
