export type AuthUser = {
  id: number;
  nome: string;
  email: string;
};

export type AuthSession = {
  token: string;
  usuario: AuthUser;
};

export type AuthMode = 'login' | 'register';

export type AuthFields = {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
};
