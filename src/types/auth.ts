export interface AuthCredentials {
  email: string;
  senha: string;
}

export interface AuthenticatedUser {
  id: number;
  nome: string;
  email: string;
}

export interface LoginResponse {
  mensagem: string;
  token: string;
  usuario: AuthenticatedUser;
}

export interface ApiAuthenticatedSession {
  version: 1;
  source: 'api';
  token: string;
  usuario: AuthenticatedUser;
}

export interface MockAuthenticatedSession {
  version: 1;
  source: 'mock';
  token: null;
  usuario: AuthenticatedUser;
}

export type AuthenticatedSession = ApiAuthenticatedSession | MockAuthenticatedSession;
